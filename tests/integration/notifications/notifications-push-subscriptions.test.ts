import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, signInAsUser } from '../helpers/test-data';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';

/**
 * Test suite for push subscription management in the new notification system.
 *
 * Structure:
 * - push_subscriptions table
 * - Fields: id, user_id, endpoint, p256dh_key, auth_key, user_agent
 * - One user can have multiple subscriptions (multiple devices)
 * - Unique constraint on (user_id, endpoint)
 *
 * These tests will FAIL until the push subscription system is implemented.
 */
describe('Push Subscriptions', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let anotherUser: Account;

  // Fake push subscription data (simulating browser Web Push API)
  const mockSubscription1 = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-1',
    p256dh_key: 'BM7w1Q2eJp8K3vX4Y5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z2',
    auth_key: 'auth-key-test-1',
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  };

  const mockSubscription2 = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
    p256dh_key: 'BN8x2R3fKq9L4wY5Z6A7B8C9D0E1F2G3H4I5J6K7L8M9N0O1P2Q3R4S5T6U7V8W9X0Y1Z3',
    auth_key: 'auth-key-test-2',
    user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
  };

  beforeAll(async () => {
    supabase = createTestClient();

    testUser = await createTestUser(supabase);
    anotherUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    await signInAsUser(supabase, testUser);
  });

  describe('Registering push subscriptions', () => {
    it('creates new push subscription for user', async () => {
      const { data: subscription, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: testUser.id,
          endpoint: mockSubscription1.endpoint,
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
          user_agent: mockSubscription1.user_agent,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(subscription).toBeDefined();
      expect(subscription!).toMatchObject({
        user_id: testUser.id,
        endpoint: mockSubscription1.endpoint,
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
        user_agent: mockSubscription1.user_agent,
      });
      expect(subscription!.id).toBeDefined();
      expect(subscription!.created_at).toBeDefined();
    });

    it('allows multiple subscriptions per user (multiple devices)', async () => {
      // Register first device
      await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint: mockSubscription1.endpoint,
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
        user_agent: mockSubscription1.user_agent,
      });

      // Register second device
      await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint: mockSubscription2.endpoint,
        p256dh_key: mockSubscription2.p256dh_key,
        auth_key: mockSubscription2.auth_key,
        user_agent: mockSubscription2.user_agent,
      });

      // Verify both exist
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', testUser.id);

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions!.map(s => s.endpoint)).toContain(mockSubscription1.endpoint);
      expect(subscriptions!.map(s => s.endpoint)).toContain(mockSubscription2.endpoint);
    });

    it('allows optional user_agent field', async () => {
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/no-user-agent',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
          // user_agent is optional
        })
        .select()
        .single();

      expect(subscription).toBeDefined();
      expect(subscription!.user_agent).toBeNull();
    });
  });

  describe('Unique constraints', () => {
    it('enforces unique constraint on (user_id, endpoint)', async () => {
      // Insert first subscription
      await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/duplicate-test',
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
      });

      // Try to insert duplicate (same user, same endpoint)
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/duplicate-test',
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23505'); // Unique violation
    });

    it('allows same endpoint for different users', async () => {
      const sharedEndpoint = 'https://fcm.googleapis.com/fcm/send/shared-endpoint';

      // testUser subscribes
      await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint: sharedEndpoint,
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
      });

      // anotherUser subscribes to same endpoint (different device type, etc.)
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      const { data: subscription2, error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: anotherUser.id,
          endpoint: sharedEndpoint,
          p256dh_key: mockSubscription2.p256dh_key,
          auth_key: mockSubscription2.auth_key,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(subscription2).toBeDefined();
    });
  });

  describe('Fetching subscriptions', () => {
    it('fetches all subscriptions for a user', async () => {
      await signInAsUser(supabase, testUser);

      // Register multiple devices
      await supabase.from('push_subscriptions').insert([
        {
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/device-1',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
          user_agent: 'Device 1',
        },
        {
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/device-2',
          p256dh_key: mockSubscription2.p256dh_key,
          auth_key: mockSubscription2.auth_key,
          user_agent: 'Device 2',
        },
      ]);

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', testUser.id);

      expect(subscriptions).toBeDefined();
      expect(subscriptions!.length).toBeGreaterThanOrEqual(2);
    });

    it('returns empty array for user with no subscriptions', async () => {
      const newUser = await createTestUser(supabase);

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', newUser.id);

      expect(subscriptions).toEqual([]);
    });
  });

  describe('Unregistering push subscriptions', () => {
    it('removes specific subscription by id', async () => {
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/to-remove',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
        })
        .select()
        .single();

      // Remove subscription
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription!.id);

      // Verify removed
      const { data: remaining } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', subscription!.id);

      expect(remaining).toEqual([]);
    });

    it('removes subscription by endpoint', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/remove-by-endpoint';

      await supabase.from('push_subscriptions').insert({
        user_id: testUser.id,
        endpoint,
        p256dh_key: mockSubscription1.p256dh_key,
        auth_key: mockSubscription1.auth_key,
      });

      // Remove by endpoint
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', testUser.id)
        .eq('endpoint', endpoint);

      // Verify removed
      const { data: remaining } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', testUser.id)
        .eq('endpoint', endpoint);

      expect(remaining).toEqual([]);
    });

    it('only removes subscriptions for the authenticated user', async () => {
      // testUser creates subscription
      await signInAsUser(supabase, testUser);
      const { data: testUserSub } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-user',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
        })
        .select()
        .single();

      // anotherUser creates subscription
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await supabase.from('push_subscriptions').insert({
        user_id: anotherUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/another-user',
        p256dh_key: mockSubscription2.p256dh_key,
        auth_key: mockSubscription2.auth_key,
      });

      // anotherUser tries to delete testUser's subscription (should fail with RLS)
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', testUserSub!.id);

      // RLS should prevent this
      expect(error).not.toBeNull();

      // Verify testUser's subscription still exists
      await signInAsUser(supabase, testUser);
      const { data: stillExists } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', testUserSub!.id);

      expect(stillExists).toHaveLength(1);
    });
  });

  describe('Cleanup of invalid subscriptions', () => {
    it('allows deletion of invalid subscriptions (410 Gone response)', async () => {
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: testUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/invalid-endpoint',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
        })
        .select()
        .single();

      // Simulate cleanup of invalid endpoint (e.g., after 410 Gone from push service)
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscription!.id);

      // Verify removed
      const { data: remaining } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', subscription!.id);

      expect(remaining).toEqual([]);
    });
  });

  describe('Subscription data integrity', () => {
    it('stores all required fields correctly', async () => {
      const testData = {
        user_id: testUser.id,
        endpoint: 'https://fcm.googleapis.com/fcm/send/integrity-test',
        p256dh_key: 'BTestP256DHKeyWithAtLeast32Characters1234567890',
        auth_key: 'test-auth-key-integrity',
        user_agent: 'Test User Agent String',
      };

      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .insert(testData)
        .select()
        .single();

      expect(subscription).toMatchObject(testData);
      expect(subscription!.id).toBeDefined();
      expect(subscription!.created_at).toBeDefined();
      expect(subscription!.updated_at).toBeDefined();
    });
  });

  describe('Cascade deletion', () => {
    it('removes push subscriptions when user is deleted', async () => {
      const tempUser = await createTestUser(supabase);

      // Create subscription for temp user
      const { data: subscription } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: tempUser.id,
          endpoint: 'https://fcm.googleapis.com/fcm/send/cascade-test',
          p256dh_key: mockSubscription1.p256dh_key,
          auth_key: mockSubscription1.auth_key,
        })
        .select()
        .single();

      // Delete user (this should cascade delete subscriptions)
      await supabase.from('profiles').delete().eq('id', tempUser.id);

      // Verify subscription was deleted
      await signInAsUser(supabase, testUser);
      const { data: remaining } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('id', subscription!.id);

      expect(remaining).toEqual([]);
    });
  });
});
