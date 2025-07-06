import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupMembership,
} from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityInfo } from '@/features/communities/types';
import type { User } from '@/features/users/types';

describe('Communities API - Membership Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser1: User;
  let testUser2: User;
  let testUser1Email: string;
  let testUser2Email: string;
  let membershipTestCommunity: CommunityInfo;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData(supabase);

    // Create shared users first
    testUser1 = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);
    testUser1Email = testUser1.email;
    testUser2Email = testUser2.email;

    // Sign in as testUser1 to create the community
    await signIn(supabase, testUser1Email, 'TestPass123!');

    // Create community with testUser1 as organizer
    membershipTestCommunity = await createTestCommunity(supabase, testUser1.id);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  describe('joinCommunity', () => {
    beforeAll(async () => {
      // Sign in as testUser2 for all joinCommunity tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
    });

    it('adds user as member', async () => {
      try {
        const membership = await api.joinCommunity(
          supabase,
          membershipTestCommunity.id,
        );

        expect(membership!.userId).toBe(testUser2.id);
        expect(membership!.communityId).toBe(membershipTestCommunity.id);
      } finally {
        await cleanupMembership(
          supabase,
          membershipTestCommunity.id,
          testUser2.id,
        );
      }
    });

    it('prevents duplicate membership', async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);

      try {
        // Second join should fail
        await expect(
          api.joinCommunity(supabase, membershipTestCommunity.id),
        ).rejects.toThrow();
      } finally {
        await cleanupMembership(
          supabase,
          membershipTestCommunity.id,
          testUser2.id,
        );
      }
    });

    it('fails with invalid community id', async () => {
      await expect(
        api.joinCommunity(supabase, 'invalid-community-id'),
      ).rejects.toThrow();
    });
  });

  describe('leaveCommunity', () => {
    beforeAll(async () => {
      // Sign in as testUser2 for all leaveCommunity tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
    });

    it('removes membership', async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);

      // Then leave
      await api.leaveCommunity(supabase, membershipTestCommunity.id);

      const { data } = await supabase
        .from('community_memberships')
        .select()
        .eq('community_id', membershipTestCommunity.id)
        .eq('user_id', testUser2.id)
        .single();

      expect(data).toBeNull();
    });

    it('allows leaving non-existent membership', async () => {
      // Try to leave without being a member
      await expect(
        api.leaveCommunity(supabase, membershipTestCommunity.id),
      ).resolves.not.toThrow();
    });
  });

  describe('fetchCommunityMembers', () => {
    beforeAll(async () => {
      // Sign in as testUser2 and add as member for all tests
      await signIn(supabase, testUser2Email, 'TestPass123!');
      await api.joinCommunity(supabase, membershipTestCommunity.id);
    });

    it('returns members with user data', async () => {
      const members = await api.fetchCommunityMembers(
        supabase,
        membershipTestCommunity.id,
      );

      expect(members.length).toBeGreaterThanOrEqual(2);
      expect(members.some((m) => m.userId === testUser1.id)).toBe(true);
      expect(members.some((m) => m.userId === testUser2.id)).toBe(true);
    });
  });

  describe('fetchUserCommunities', () => {
    it('returns communities for user', async () => {
      const memberships = await api.fetchUserCommunities(
        supabase,
        testUser1.id,
      );

      expect(memberships.length).toBeGreaterThan(0);
      expect(memberships.every((m) => m.userId === testUser1.id)).toBe(true);
      expect(
        memberships.some((m) => m.communityId === membershipTestCommunity.id),
      ).toBe(true);
    });

    it('returns empty array for user with no communities', async () => {
      // Create a new user who hasn't joined any communities
      const lonelyUser = await createTestUser(supabase);

      try {
        const communities = await api.fetchUserCommunities(
          supabase,
          lonelyUser.id,
        );

        expect(communities).toHaveLength(0);
      } finally {
        // lonelyUser will be cleaned up in afterAll
      }
    });
  });
});