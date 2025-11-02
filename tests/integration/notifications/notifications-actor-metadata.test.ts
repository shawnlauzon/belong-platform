import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  signInAsUser,
} from '../helpers/test-data';
import { createComment } from '@/features/comments';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities';

/**
 * Test suite for actor metadata in notifications.
 *
 * Ensures that actor information (full_name, display_name, avatar_url)
 * is correctly populated in notification metadata, with proper fallbacks
 * for users who don't have full_name set (email signups).
 */
describe('Notification Actor Metadata', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: Account;
  let commenter: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner (signed in)
    resourceOwner = await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);

    // Create commenter (will be the actor)
    commenter = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, resourceOwner);
  });

  it('includes actor_full_name computed from first_name and last_name when full_name is NULL', async () => {
    // Verify commenter has first_name and last_name but no full_name
    const { data: commenterProfile } = await supabase
      .from('public_profiles')
      .select('first_name, last_name, full_name')
      .eq('id', commenter.id)
      .single();

    expect(commenterProfile).toBeDefined();
    expect(commenterProfile!.first_name).toBeTruthy();
    expect(commenterProfile!.full_name).toBeNull(); // Email signup users have NULL full_name

    // Create resource and comment to trigger notification
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signInAsUser(supabase, commenter);
    await createComment(supabase, commenter.id, {
      content: 'Test comment',
      resourceId: resource.id,
    });

    // Check notification has actor_full_name
    await signInAsUser(supabase, resourceOwner);
    const { data: notifications } = await supabase
      .from('notification_details')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('action', 'resource.commented')
      .eq('resource_id', resource.id);

    expect(notifications).toHaveLength(1);

    const metadata = notifications![0].metadata as Record<string, unknown>;
    expect(metadata).toBeDefined();
    expect(metadata.actor_full_name).toBeTruthy();

    // Should be "FirstName LastName" computed from first_name + last_name
    const expectedFullName = commenterProfile!.last_name
      ? `${commenterProfile!.first_name} ${commenterProfile!.last_name}`
      : commenterProfile!.first_name;

    expect(metadata.actor_full_name).toBe(expectedFullName);
  });

  it('includes actor_full_name from full_name when it exists (Google signin case)', async () => {
    // Create a new user to simulate Google signin
    const googleUser = await createTestUser(supabase);

    // Update user_metadata to set full_name (simulates Google signin)
    await supabase
      .from('profiles')
      .update({
        user_metadata: {
          first_name: 'Google',
          last_name: 'User',
          full_name: 'Google User Name',
        },
      })
      .eq('id', googleUser.id);

    // Create resource as owner
    await signInAsUser(supabase, resourceOwner);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Create comment as Google user (notification created with full_name set)
    await signInAsUser(supabase, googleUser);
    await createComment(supabase, googleUser.id, {
      content: 'Test comment with full_name',
      resourceId: resource.id,
    });

    // Check notification uses full_name
    await signInAsUser(supabase, resourceOwner);
    const { data: notifications } = await supabase
      .from('notification_details')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('action', 'resource.commented')
      .eq('resource_id', resource.id);

    expect(notifications).toHaveLength(1);

    const metadata = notifications![0].metadata as Record<string, unknown>;
    expect(metadata.actor_full_name).toBe('Google User Name');
  });

  it('includes actor_full_name as first_name when last_name is NULL', async () => {
    // Create a new user with only first_name
    const singleNameUser = await createTestUser(supabase);

    // Update user_metadata to only have first_name (no last_name)
    await supabase
      .from('profiles')
      .update({
        user_metadata: {
          first_name: 'SingleName',
        },
      })
      .eq('id', singleNameUser.id);

    // Create resource as owner
    await signInAsUser(supabase, resourceOwner);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    // Create comment as single name user (notification created with last_name as NULL)
    await signInAsUser(supabase, singleNameUser);
    await createComment(supabase, singleNameUser.id, {
      content: 'Test comment with only first name',
      resourceId: resource.id,
    });

    // Check notification uses first_name only
    await signInAsUser(supabase, resourceOwner);
    const { data: notifications } = await supabase
      .from('notification_details')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('action', 'resource.commented')
      .eq('resource_id', resource.id);

    expect(notifications).toHaveLength(1);

    const metadata = notifications![0].metadata as Record<string, unknown>;
    expect(metadata.actor_full_name).toBe('SingleName');
  });

  it('includes actor_display_name and actor_avatar_url in metadata', async () => {
    // Create resource and comment
    await signInAsUser(supabase, resourceOwner);
    const resource = await createTestResource(
      supabase,
      testCommunity.id,
      'offer',
    );

    await signInAsUser(supabase, commenter);
    await createComment(supabase, commenter.id, {
      content: 'Test for all actor metadata',
      resourceId: resource.id,
    });

    // Check all actor metadata fields
    await signInAsUser(supabase, resourceOwner);
    const { data: notifications } = await supabase
      .from('notification_details')
      .select('*')
      .eq('user_id', resourceOwner.id)
      .eq('action', 'resource.commented')
      .eq('resource_id', resource.id);

    expect(notifications).toHaveLength(1);

    const metadata = notifications![0].metadata as Record<string, unknown>;
    expect(metadata.actor_full_name).toBeDefined();
    expect(metadata.actor_display_name).toBeDefined();
    // actor_avatar_url might be null, but the key should exist
    expect('actor_avatar_url' in metadata).toBe(true);
  });
});
