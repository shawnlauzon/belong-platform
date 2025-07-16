import { createCommunity, joinCommunity } from '@/features/communities/api';
import { signUp } from '@/features/auth/api';
import { createFakeCommunityInput } from '@/features/communities/__fakes__';
import { createResource } from '@/features/resources/api';
import { createFakeResourceInput } from '@/features/resources/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { faker } from '@faker-js/faker';
import { Shoutout, ShoutoutInput, createShoutout } from '@/features';

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

  // Add 300ms pause before signUp to avoid rate limiting
  await new Promise((resolve) => setTimeout(resolve, 300));

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
  type: 'offer' | 'request' = 'request',
) {
  const data = createFakeResourceInput({
    title: `${TEST_PREFIX}Resource_${Date.now()}`,
    description: `${TEST_PREFIX} test resource`,
    type,
    communityIds: [communityId],
    category: 'tools', // Use a valid category
  });

  // Add small delay to ensure community membership trigger has completed
  await new Promise((resolve) => setTimeout(resolve, 100));

  const resource = await createResource(supabase, data);
  if (!resource) throw new Error('Failed to create resource');

  return resource;
}

export async function createTestResourceShoutout({
  supabase,
  resourceId,
  toUserId,
  communityId,
}: {
  supabase: SupabaseClient<Database>;
  resourceId: string;
  toUserId: string;
  communityId: string;
}): Promise<Shoutout> {
  const shoutoutData: ShoutoutInput & {
    toUserId: string;
    communityId: string;
  } = {
    resourceId,
    message: `${TEST_PREFIX}Thank you for sharing this resource!`,
    toUserId,
    communityId,
  };

  const shoutout = await createShoutout(supabase, shoutoutData);
  if (!shoutout) throw new Error('Failed to create shoutout');

  return shoutout;
}
