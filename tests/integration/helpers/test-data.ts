import { createCommunity } from '@/features/communities/api';
import { signIn, signUp } from '@/features/auth/api';
import { createFakeCommunityInput } from '@/features/communities/__fakes__';
import {
  createResource,
  createResourceTimeslot,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { faker } from '@faker-js/faker';
import {
  Account,
  ResourceCategory,
  Shoutout,
  ShoutoutInput,
  createShoutout,
} from '@/features';
import { getInvitationCode } from '@/features/invitations/api';
import { toDomainUserConnection } from '@/features/connections';
import type { UserConnection } from '@/features/connections/types';

// Test data prefix to identify test records
export const TEST_PREFIX = 'test_int_';

export async function createTestUser(
  supabase: SupabaseClient<Database>,
  options?: { connectionCode?: string },
) {
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
    options?.connectionCode,
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
  category?: ResourceCategory,
  requiresApproval: boolean = false,
) {
  // Set appropriate category defaults based on type
  const defaultCategory = category ?? (type === 'event' ? 'food' : 'tools');

  // Create resource input without using the faker function to avoid potential conflicts
  const data = {
    title: `${TEST_PREFIX}Resource_${Date.now()}`,
    description: `${TEST_PREFIX} test resource`,
    type: type as 'offer' | 'request' | 'event',
    communityIds: [communityId],
    category: defaultCategory,
    status: 'scheduled' as const,
    locationName: 'Test Location',
    requiresApproval,
    lastRenewedAt: new Date(),
    imageUrls: [],
  };

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
    receiverId: string;
    communityId: string;
    message: string;
    resourceId?: string;
  },
): Promise<Shoutout> {
  // Get current user to use as sender
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user for shoutout sender');

  // Create a resource if none provided since resource_id is required
  let resourceId = data.resourceId;
  if (!resourceId) {
    const resource = await createTestResource(
      supabase,
      data.communityId,
      'offer',
    );
    resourceId = resource.id;
  }

  const shoutoutData: Omit<ShoutoutInput, 'receiverId' | 'communityId'> = {
    resourceId,
    message:
      data.message || `${TEST_PREFIX}Thank you for sharing this resource!`,
  };

  const shoutout = await createShoutout(supabase, user.id, shoutoutData);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user for shoutout sender');

  return createTestShoutout(supabase, {
    receiverId,
    communityId,
    resourceId,
    message: `${TEST_PREFIX}Thank you for sharing this resource!`,
  });
}

/**
 * Creates a direct connection between two users using the simplified system
 * @param initiatorSupabase - Supabase client for the first user
 * @param requesterSupabase - Supabase client for the second user
 * @param communityId - Community ID where connection is being made
 */
export async function createTestConnection(
  initiatorSupabase: SupabaseClient<Database>,
  requesterSupabase: SupabaseClient<Database>,
  communityId: string,
): Promise<UserConnection> {
  // Get current user IDs
  const {
    data: { user: initiatorUser },
  } = await initiatorSupabase.auth.getUser();
  const {
    data: { user: requesterUser },
  } = await requesterSupabase.auth.getUser();

  if (!initiatorUser?.id || !requesterUser?.id) {
    throw new Error('Both users must be authenticated');
  }

  // Call the database function to create direct connection
  const { data: connectionId, error } = await initiatorSupabase.rpc(
    'create_user_connection',
    {
      p_inviter_id: initiatorUser.id,
      p_invitee_id: requesterUser.id,
    },
  );

  if (error) {
    throw new Error(`Failed to create connection: ${error.message}`);
  }

  if (!connectionId) {
    throw new Error('Connection was not created (possibly already exists)');
  }

  // Fetch the created connection to return it in the expected format
  const { data: connectionData, error: fetchError } = await initiatorSupabase
    .from('user_connections')
    .select('*')
    .eq('id', connectionId)
    .single();

  if (fetchError || !connectionData) {
    throw new Error(
      `Failed to fetch created connection: ${fetchError?.message}`,
    );
  }

  // Transform to domain type
  return toDomainUserConnection(connectionData);
}

/**
 * Signs in as a specific user for testing different perspectives
 */
export async function signInAsUser(
  supabase: SupabaseClient<Database>,
  user: Account,
): Promise<void> {
  await signIn(supabase, user.email, 'TestPass123!');
}
