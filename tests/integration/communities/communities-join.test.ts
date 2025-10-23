import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import * as api from '@/features/communities/api';
import { getInvitationCode } from '@/features/invitations/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { Account } from '@/features/auth/types';

describe('Communities - Joining Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let anotherUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test user (automatically signed in)
    testUser = await createTestUser(supabase);

    // Create community as testUser (becomes organizer)
    testCommunity = await createTestCommunity(supabase);

    // Create another user for join tests
    anotherUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Sign in as anotherUser for consistency in join tests
    await signIn(supabase, anotherUser.email, 'TestPass123!');
  });

  describe('Basic Join Operations', () => {
    it('allows user to join community', async () => {
      // Create a new community as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');
      const newCommunity = await createTestCommunity(supabase);

      // Switch to anotherUser and join the community
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      
      const membership = await api.joinCommunity(supabase, anotherUser.id, newCommunity.id);

      expect(membership).toBeTruthy();
      expect(membership.communityId).toBe(newCommunity.id);
      expect(membership.userId).toBe(anotherUser.id);
      expect(membership.role).toBe('member');
    });

    it('prevents user from joining same community twice', async () => {
      // Create a new community as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');
      const newCommunity = await createTestCommunity(supabase);

      // Switch to anotherUser and join the community
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await api.joinCommunity(supabase, anotherUser.id, newCommunity.id);

      // Try to join again - should throw error
      await expect(
        api.joinCommunity(supabase, newCommunity.id)
      ).rejects.toThrow('User is already a member of this community');
    });

    it('allows user to leave community', async () => {
      // Create a new community as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');
      const newCommunity = await createTestCommunity(supabase);

      // Switch to anotherUser, join and then leave
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await api.joinCommunity(supabase, anotherUser.id, newCommunity.id);
      
      await api.leaveCommunity(supabase, anotherUser.id, newCommunity.id);

      // Verify membership is gone
      const members = await api.fetchCommunityMemberships(
        supabase,
        newCommunity.id,
      );
      expect(members.some((m) => m.userId === anotherUser.id)).toBe(false);
    });

    it('requires authentication to join community', async () => {
      const unauthenticatedClient = createTestClient();
      
      await expect(
        api.joinCommunity(unauthenticatedClient, "test-user-id", testCommunity.id)
      ).rejects.toThrow();
    });

    it('requires authentication to leave community', async () => {
      const unauthenticatedClient = createTestClient();
      
      await expect(
        api.leaveCommunity(unauthenticatedClient, testCommunity.id)
      ).rejects.toThrow();
    });
  });

  describe('Join with Connection Codes', () => {
    it('allows user to join community using connection code', async () => {
      // Get testUser's member code (testUser is already in testCommunity as organizer)
      await signIn(supabase, testUser.email, 'TestPass123!');
      const memberCode = await getInvitationCode(supabase, testUser.id, testCommunity.id);

      // Create new user (not joined to any community yet)
      const supabaseNewUser = createTestClient();
      const newUserAccount = await createTestUser(supabaseNewUser);

      // New user joins community using connection code
      const membership = await api.joinCommunityWithCode(supabaseNewUser, newUserAccount.id, memberCode.code);

      expect(membership).toBeTruthy();
      expect(membership.communityId).toBe(testCommunity.id);
      expect(membership.userId).toBe(newUserAccount.id);
      expect(membership.role).toBe('member');

      // Verify membership was created in database
      const { data: dbMembership } = await supabaseNewUser
        .from('community_memberships')
        .select('*')
        .eq('user_id', newUserAccount.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(dbMembership).toBeTruthy();
      expect(dbMembership!.user_id).toBe(newUserAccount.id);
      expect(dbMembership!.community_id).toBe(testCommunity.id);

      // Verify new user got their own connection code
      const { data: newUserCode } = await supabaseNewUser
        .from('invitation_codes')
        .select('*')
        .eq('user_id', newUserAccount.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(newUserCode).toBeTruthy();
      expect(newUserCode!.code).toHaveLength(8);
      expect(newUserCode!.is_active).toBe(true);
    });

    it('rejects invalid connection code', async () => {
      // Create new user
      const supabaseNewUser = createTestClient();
      const testNewUser = await createTestUser(supabaseNewUser);

      // Try to join with invalid connection code
      await expect(
        api.joinCommunityWithCode(supabaseNewUser, testNewUser.id, 'INVALID1')
      ).rejects.toThrow();
    });

    it('rejects non-existent connection code', async () => {
      // Create new user
      const supabaseNewUser = createTestClient();
      const testNewUser = await createTestUser(supabaseNewUser);

      // Try to join with valid format but non-existent code
      await expect(
        api.joinCommunityWithCode(supabaseNewUser, testNewUser.id, 'NVALD234')
      ).rejects.toThrow();
    });

    it('prevents user from joining same community twice using connection code', async () => {
      // Get testUser's member code
      await signIn(supabase, testUser.email, 'TestPass123!');
      const memberCode = await getInvitationCode(supabase, testUser.id, testCommunity.id);

      // Create new user and join community
      const supabaseNewUser = createTestClient();
      const newUserAccount = await createTestUser(supabaseNewUser);
      await api.joinCommunityWithCode(supabaseNewUser, newUserAccount.id, memberCode.code);

      // Try to join again using connection code
      await expect(
        api.joinCommunityWithCode(supabaseNewUser, newUserAccount.id, memberCode.code)
      ).rejects.toThrow();
    });

    it('requires authentication to join with connection code', async () => {
      // Get testUser's member code
      await signIn(supabase, testUser.email, 'TestPass123!');
      const memberCode = await getInvitationCode(supabase, testUser.id, testCommunity.id);

      // Try to join without authentication
      const unauthenticatedClient = createTestClient();
      await expect(
        api.joinCommunityWithCode(unauthenticatedClient, "dummy-user-id", memberCode.code)
      ).rejects.toThrow();
    });
  });

  describe('Connection Code Generation', () => {
    it('auto-generates connection code when user joins community', async () => {
      // Create a new community as testUser
      await signIn(supabase, testUser.email, 'TestPass123!');
      const newCommunity = await createTestCommunity(supabase);

      // Switch to anotherUser and join
      await signIn(supabase, anotherUser.email, 'TestPass123!');
      await api.joinCommunity(supabase, anotherUser.id, newCommunity.id);

      // Wait for triggers to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check that user has connection code
      const { data: code } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('user_id', anotherUser.id)
        .eq('community_id', newCommunity.id)
        .single();

      expect(code).toBeTruthy();
      expect(code!.code).toHaveLength(8);
      expect(code!.is_active).toBe(true);
    });
  });
});