import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import {
  TEST_PREFIX,
  createTestUser,
  createTestCommunity,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/auth/api';
import { getMemberConnectionCode } from '@/features/connections/api';
import { faker } from '@faker-js/faker';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Helper to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Auto-join on Signup - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('signUp with invitation code', () => {
    it('auto-joins user to community when valid connection code provided', async () => {
      // Step 1: Create an organizer user and community
      const organizer = await createTestUser(supabase);

      // Create a community as the organizer (this auto-joins them)
      const community = await createTestCommunity(supabase);

      // Step 2: Get the organizer's connection code for this community
      const invitationCode = await getMemberConnectionCode(
        supabase,
        community.id,
      );
      expect(invitationCode).toBeDefined();

      // Step 3: Sign up a new user with the invitation code
      const newUserEmail = `${TEST_PREFIX}newuser_${faker.internet.email()}`;
      const newUserPassword = 'TestPass123!';
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      await delay(200); // Rate limiting
      const newUserAccount = await api.signUp(
        supabase,
        newUserEmail,
        newUserPassword,
        firstName,
        lastName,
        invitationCode.code, // Pass the invitation code
      );

      expect(newUserAccount).toBeDefined();

      // Wait for the trigger to complete
      await delay(1000);

      // Step 4: Verify the user exists in auth.users and profiles
      const { data: authUser } = await serviceClient.auth.admin.getUserById(
        newUserAccount.id,
      );
      expect(authUser.user).toBeDefined();
      expect(authUser.user?.id).toBe(newUserAccount.id);

      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', newUserAccount.id)
        .single();

      expect(profile).toBeDefined();

      // Verify invitation code is in the auth user metadata (not profile)
      expect(authUser.user?.user_metadata?.invitation_code).toBe(
        invitationCode.code,
      );

      // Step 5: Verify the new user was auto-joined to the community
      const { data: membership } = await serviceClient
        .from('community_memberships')
        .select('*')
        .eq('community_id', community.id)
        .eq('user_id', newUserAccount.id)
        .maybeSingle();

      expect(membership).toBeDefined();

      // Step 6: Verify a connection request was created
      const { data: connectionRequest } = await serviceClient
        .from('connection_requests')
        .select('*')
        .eq('community_id', community.id)
        .eq('requester_id', newUserAccount.id)
        .eq('initiator_id', organizer.id)
        .maybeSingle();

      expect(connectionRequest).toBeDefined();
      expect(connectionRequest?.status).toBe('pending');
    });

    it('handles invalid invitation code gracefully', async () => {
      const email = `${TEST_PREFIX}invalid_${faker.internet.email()}`;
      const password = 'TestPass123!';
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const invalidCode = 'INVALID123';

      await delay(200); // Rate limiting

      // Should still create the user even with invalid invitation code
      const account = await api.signUp(
        supabase,
        email,
        password,
        firstName,
        lastName,
        invalidCode,
      );

      expect(account).toBeDefined();

      // Wait for trigger to complete
      await delay(1000);

      // Verify profile was created (even though invitation failed)
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', account.id)
        .single();

      expect(profile).toBeDefined();

      // Verify no community memberships were created
      const { data: memberships } = await serviceClient
        .from('community_memberships')
        .select('*')
        .eq('user_id', account.id);

      expect(memberships || []).toHaveLength(0);
    });

    it('works without invitation code', async () => {
      const email = `${TEST_PREFIX}no_code_${faker.internet.email()}`;
      const password = 'TestPass123!';
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      await delay(200); // Rate limiting

      // Sign up without invitation code
      const account = await api.signUp(
        supabase,
        email,
        password,
        firstName,
        lastName,
      );

      expect(account).toBeDefined();

      // Wait for trigger to complete
      await delay(1000);

      // Verify profile was created
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', account.id)
        .single();

      expect(profile).toBeDefined();

      // Verify no community memberships were created
      const { data: memberships } = await serviceClient
        .from('community_memberships')
        .select('*')
        .eq('user_id', account.id);

      expect(memberships || []).toHaveLength(0);
    });
  });
});
