import { createCommunity } from '@/features/communities/api';
import { signUp } from '@/features/auth/api';
import { createFakeCommunityInput } from '@/features/communities/__fakes__';
import {
  createResource,
  createResourceTimeslot,
} from '@/features/resources/api';
import { createFakeResourceInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { faker } from '@faker-js/faker';
import {
  ResourceCategory,
  Shoutout,
  ShoutoutInput,
  createShoutout,
} from '@/features';
import {
  getMemberConnectionCode,
  approveConnection,
  createConnectionRequest,
} from '@/features/connections/api';
import type { UserConnection } from '@/features/connections/types';

// Test data prefix to identify test records
export const TEST_PREFIX = 'test_int_';

export async function createTestUser(supabase: SupabaseClient<Database>) {
  const firstName = `${TEST_PREFIX}${faker.person.firstName()}`;
  const lastName = `${faker.person.lastName()}`;
  const testEmail = faker.internet.email({
    firstName,
    lastName,
    provider: 'example.com',
  });

  // Add 500ms pause before signUp to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 500));

  const account = await signUp(
    supabase,
    testEmail,
    'TestPass123!',
    firstName,
    lastName,
  );

  return account;
}

export async function createTestCommunity(supabase: SupabaseClient<Database>) {
  const data = createFakeCommunityInput({
    name: `${TEST_PREFIX}Community_${Date.now()}`,
    description: `${TEST_PREFIX} test community`,
  });

  const community = await createCommunity(supabase, data);
  if (!community) throw new Error('Failed to create community');

  return community;
}

export async function createTestResource(
  supabase: SupabaseClient<Database>,
  communityId: string,
  type: 'offer' | 'request' | 'event' = 'offer',
  category: ResourceCategory = 'tools',
) {
  const data = createFakeResourceInput({
    title: `${TEST_PREFIX}Resource_${Date.now()}`,
    description: `${TEST_PREFIX} test resource`,
    type,
    communityIds: [communityId],
    category,
    status: 'open', // Ensure resources are open for feed tests
    lastRenewedAt: new Date(),
  });

  // Add small delay to ensure community membership trigger has completed
  await new Promise((resolve) => setTimeout(resolve, 100));

  const resource = await createResource(supabase, data);
  if (!resource) throw new Error('Failed to create resource');

  return resource;
}

export async function createTestResourceTimeslot(
  supabase: SupabaseClient<Database>,
  resourceId: string,
) {
  const startTime = faker.date.recent();
  const endTime = new Date(
    startTime.getTime() + faker.number.int({ min: 30, max: 180 }) * 60 * 1000,
  );

  const timeslot = await createResourceTimeslot(supabase, {
    resourceId,
    startTime,
    endTime,
    status: 'active',
  });
  if (!timeslot) throw new Error('Failed to create resource timeslot');

  return timeslot;
}

export async function createTestShoutout(
  supabase: SupabaseClient<Database>,
  data: {
    senderId: string;
    receiverId: string;
    communityId: string;
    message: string;
    resourceId?: string;
  }
): Promise<Shoutout> {
  // Create a resource if none provided since resource_id is required
  let resourceId = data.resourceId;
  if (!resourceId) {
    const resource = await createTestResource(supabase, data.communityId, 'offer');
    resourceId = resource.id;
  }

  const shoutoutData: ShoutoutInput & {
    receiverId: string;
    communityId: string;
  } = {
    resourceId,
    message: data.message || `${TEST_PREFIX}Thank you for sharing this resource!`,
    receiverId: data.receiverId,
    communityId: data.communityId,
  };

  const shoutout = await createShoutout(supabase, shoutoutData);
  if (!shoutout) throw new Error('Failed to create shoutout');

  return shoutout;
}

// Legacy version for backward compatibility
export async function createTestShoutoutForResource({
  supabase,
  resourceId,
  receiverId,
  communityId,
}: {
  supabase: SupabaseClient<Database>;
  resourceId: string;
  receiverId: string;
  communityId: string;
}): Promise<Shoutout> {
  // Get current user to use as sender
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user for shoutout sender');

  return createTestShoutout(supabase, {
    senderId: user.id,
    receiverId,
    communityId,
    resourceId,
    message: `${TEST_PREFIX}Thank you for sharing this resource!`,
  });
}

/**
 * Creates a connection request by processing a connection link
 * @param requesterSupabase - Supabase client for the user scanning the code
 * @param communityId - Community ID where connection is being made
 * @param connectionCode - The connection code to use
 */
export async function createTestConnectionRequest(
  requesterSupabase: SupabaseClient<Database>,
  communityId: string,
  connectionCode: string,
): Promise<{ id: string; connectionCode: string }> {
  // Process the connection link as the requester
  const response = await createConnectionRequest(
    requesterSupabase,
    connectionCode,
  );

  if (!response.success || !response.connectionRequestId) {
    throw new Error(`Failed to create connection request: ${response.message}`);
  }

  return {
    id: response.connectionRequestId,
    connectionCode,
  };
}

/**
 * Legacy version for backward compatibility
 * Creates a connection request by processing a connection link
 * @param initiatorSupabase - Supabase client for the code owner
 * @param requesterSupabase - Supabase client for the user scanning the code
 * @param communityId - Community ID where connection is being made
 */
export async function createTestConnectionRequestLegacy(
  initiatorSupabase: SupabaseClient<Database>,
  requesterSupabase: SupabaseClient<Database>,
  communityId: string,
): Promise<{ connectionCode: string; requestId: string }> {
  // Get the initiator's connection code
  const memberCode = await getMemberConnectionCode(
    initiatorSupabase,
    communityId,
  );

  // Process the connection link as the requester
  const response = await createConnectionRequest(
    requesterSupabase,
    memberCode.code,
  );

  if (!response.success || !response.connectionRequestId) {
    throw new Error(`Failed to create connection request: ${response.message}`);
  }

  return {
    connectionCode: memberCode.code,
    requestId: response.connectionRequestId,
  };
}

/**
 * Creates an approved connection between two users
 * @param initiatorSupabase - Supabase client for the code owner
 * @param requesterSupabase - Supabase client for the user scanning the code
 * @param communityId - Community ID where connection is being made
 */
export async function createTestConnection(
  initiatorSupabase: SupabaseClient<Database>,
  requesterSupabase: SupabaseClient<Database>,
  communityId: string,
): Promise<UserConnection> {
  // First create a connection request using the legacy version
  const { requestId } = await createTestConnectionRequestLegacy(
    initiatorSupabase,
    requesterSupabase,
    communityId,
  );

  // Then approve it as the initiator
  const connection = await approveConnection(initiatorSupabase, requestId);

  return connection;
}
