import { createCommunity } from '@/features/communities/api';
import { signUp } from '@/features/auth/api';
import { createFakeCommunityData } from '@/features/communities/__fakes__';
import { createFakeUserData } from '@/features/users/__fakes__';
import { createResource } from '@/features/resources/api';
import { createFakeResourceData } from '@/features/resources/__fakes__';
import { createEvent } from '@/features/events/api';
import { createFakeEventData } from '@/features/events/__fakes__';
import { createFakeDbShoutout } from '@/features/shoutouts/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { faker } from '@faker-js/faker';

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
  const data = createFakeCommunityData({
    name: `${TEST_PREFIX}Community_${Date.now()}`,
    description: `${TEST_PREFIX} test community`,
  });

  const community = await createCommunity(supabase, data);
  if (!community) throw new Error('Failed to create community');

  return community;
}

export async function createTestResource(
  supabase: SupabaseClient<Database>,
  ownerId: string,
  communityId: string,
) {
  const data = createFakeResourceData({
    title: `${TEST_PREFIX}Resource_${Date.now()}`,
    description: `${TEST_PREFIX} test resource`,
    ownerId,
    communityId,
  });

  const resource = await createResource(supabase, data);
  if (!resource) throw new Error('Failed to create resource');

  return resource;
}

export async function createTestEvent(
  supabase: SupabaseClient<Database>,
  organizerId: string,
  communityId: string,
) {
  const data = createFakeEventData({
    title: `${TEST_PREFIX}Event_${Date.now()}`,
    description: `${TEST_PREFIX} test event`,
    organizerId,
    communityId,
    startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
    imageUrls: undefined, // Don't generate random banner URLs
  });

  const event = await createEvent(supabase, data);
  if (!event) throw new Error('Failed to create event');

  return event;
}

export async function createTestShoutout(
  supabase: SupabaseClient<Database>,
  fromUserId: string,
  toUserId: string,
  resourceId: string,
  communityId: string,
) {
  const shoutoutData = createFakeDbShoutout({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    resource_id: resourceId,
    community_id: communityId,
    message: `${TEST_PREFIX}Thank you for sharing this resource!`,
  });

  const { data, error } = await supabase
    .from('shoutouts')
    .insert([shoutoutData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test shoutout: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to create test shoutout: No data returned');
  }

  return data;
}
