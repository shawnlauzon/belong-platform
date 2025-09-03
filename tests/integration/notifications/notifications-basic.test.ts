import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser } from '../helpers/test-data';
import { updatePreferences } from '@/features/notifications';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';

describe('Notification System - Basic Expansion', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();
    testUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  beforeEach(async () => {
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  it('should support new notification preference types in database', async () => {
    // Test that we can update preferences with the new notification types
    await updatePreferences(supabase, {
      shoutout_received: false,
      connection_request: true,
      trust_points_received: false,
    });

    // Verify the preferences were saved in the profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', testUser.id)
      .single();

    expect(profile?.notification_preferences).toMatchObject({
      shoutout_received: false,
      connection_request: true,
      trust_points_received: false,
    });
  });

  it('should prevent users from manually inserting notifications', async () => {
    // Test that regular users cannot insert notifications directly (they should be created by triggers)
    const { error } = await supabase.from('notifications').insert({
      user_id: testUser.id,
      type: 'shoutout_received',
      actor_id: testUser.id,
      title: 'Test notification',
    });

    // This should fail due to RLS policy - notifications should only be created by triggers
    expect(error).not.toBeNull();
  });
});
