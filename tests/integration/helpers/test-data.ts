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
  processConnectionLink,
  approveConnection,
} from '@/features/connections/api';
import type {
  MemberConnectionCode,
  ConnectionRequest,
  UserConnection,
} from '@/features/connections/types';

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
    lastRenewedAt: new Date()
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

export async function createTestShoutout({
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
  const shoutoutData: ShoutoutInput & {
    receiverId: string;
    communityId: string;
  } = {
    resourceId,
    message: `${TEST_PREFIX}Thank you for sharing this resource!`,
    receiverId,
    communityId,
  };

  const shoutout = await createShoutout(supabase, shoutoutData);
  if (!shoutout) throw new Error('Failed to create shoutout');

  return shoutout;
}

/**
 * Gets or creates a member connection code for the current user in a community
 */
export async function createTestMemberConnectionCode(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<MemberConnectionCode> {
  const memberCode = await getMemberConnectionCode(supabase, communityId);
  return memberCode;
}

/**
 * Creates a connection request by processing a connection link
 * @param initiatorSupabase - Supabase client for the code owner
 * @param requesterSupabase - Supabase client for the user scanning the code
 * @param communityId - Community ID where connection is being made
 */
export async function createTestConnectionRequest(
  initiatorSupabase: SupabaseClient<Database>,
  requesterSupabase: SupabaseClient<Database>,
  communityId: string,
): Promise<{ connectionCode: string; requestId: string }> {
  // Get the initiator's connection code
  const memberCode = await getMemberConnectionCode(initiatorSupabase, communityId);
  
  // Process the connection link as the requester
  const response = await processConnectionLink(requesterSupabase, memberCode.code);
  
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
  // First create a connection request
  const { requestId } = await createTestConnectionRequest(
    initiatorSupabase,
    requesterSupabase,
    communityId,
  );
  
  // Then approve it as the initiator
  const connection = await approveConnection(initiatorSupabase, requestId);
  
  return connection;
}
