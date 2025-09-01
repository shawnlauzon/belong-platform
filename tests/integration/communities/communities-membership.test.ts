import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { cleanupAllTestData, cleanupMembership } from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import { Community } from '@/features';
import { signIn } from '@/features/auth/api';

describe('Communities API - Membership Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser1: Account;
  let testUser2: Account;
  let membershipTestCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared users first
    testUser1 = await createTestUser(supabase);

    // Create community with testUser1 as organizer
    membershipTestCommunity = await createTestCommunity(supabase);

    testUser2 = await createTestUser(supabase);
  });

  afterAll(async () => {
    // await cleanupAllTestData();
  });

  describe('joinCommunity', () => {
    afterEach(async () => {
      await cleanupMembership(membershipTestCommunity.id, testUser2.id);
    });

    it('adds user as member', async () => {
      const membership = await api.joinCommunity(
        supabase,
        membershipTestCommunity.id,
      );

      expect(membership!.userId).toBe(testUser2.id);
      expect(membership!.communityId).toBe(membershipTestCommunity.id);

      const { data } = await supabase
        .from('community_memberships')
        .select()
        .eq('community_id', membershipTestCommunity.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(data).toBeTruthy();
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
        await cleanupMembership(membershipTestCommunity.id, testUser2.id);
      }
    });

    it('fails with invalid community id', async () => {
      await expect(
        api.joinCommunity(supabase, 'invalid-community-id'),
      ).rejects.toThrow();
    });
  });

  describe('community membership tests', () => {
    beforeAll(async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);
    });

    afterAll(async () => {
      try {
        await api.leaveCommunity(supabase, membershipTestCommunity.id);
      } catch {
        // ignore
      }
    });

    it('community members can see other members', async () => {
      const members = await api.fetchCommunityMemberships(
        supabase,
        membershipTestCommunity.id,
      );

      expect(members).toHaveLength(2);

      expect(members).toContainEqual(
        expect.objectContaining({
          userId: testUser2.id,
          communityId: membershipTestCommunity.id,
        }),
      );
    });

    it('includes organizer as a member', async () => {
      const members = await api.fetchCommunityMemberships(
        supabase,
        membershipTestCommunity.id,
      );

      expect(members).toContainEqual(
        expect.objectContaining({
          userId: testUser1.id,
          communityId: membershipTestCommunity.id,
        }),
      );
    });

    it('returns communities for user', async () => {
      const memberships = await api.fetchUserCommunities(
        supabase,
        testUser2.id,
      );
      expect(memberships).toHaveLength(1);
      expect(memberships).toContainEqual(
        expect.objectContaining({
          userId: testUser2.id,
          communityId: membershipTestCommunity.id,
        }),
      );
    });

    it('includes community for organizer', async () => {
      const communities = await api.fetchUserCommunities(
        supabase,
        testUser1.id,
      );

      expect(communities).toContainEqual(
        expect.objectContaining({
          userId: testUser1.id,
          communityId: membershipTestCommunity.id,
        }),
      );
    });

    // This isn't what I wanted originally, however RLS makes it challenging
    // to validate this at the database level. So at the moment, just allow
    // it and we can always add application-level limits if needed.
    it('can view members of another community', async () => {
      const anotherCommunity = await createTestCommunity(supabase);
      await expect(
        api.fetchCommunityMemberships(supabase, anotherCommunity.id),
      ).resolves.toHaveLength(1);
      await signIn(supabase, testUser1.email, 'TestPass123!');
      try {
        await expect(
          api.fetchCommunityMemberships(supabase, anotherCommunity.id),
        ).resolves.toHaveLength(1);
      } finally {
        await signIn(supabase, testUser2.email, 'TestPass123!');
      }
    });
  });

  describe('leaveCommunity', () => {
    beforeEach(async () => {
      // First join
      await api.joinCommunity(supabase, membershipTestCommunity.id);
    });

    afterEach(async () => {
      try {
        await api.leaveCommunity(supabase, membershipTestCommunity.id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // ignore
      }
    });

    it('leaving the community removes membership', async () => {
      await api.leaveCommunity(supabase, membershipTestCommunity.id);

      const { data } = await supabase
        .from('community_memberships')
        .select()
        .eq('community_id', membershipTestCommunity.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(data).toBeNull();
    });

    it('leaving the community decreases the number of members', async () => {
      let community = await api.fetchCommunityById(
        supabase,
        membershipTestCommunity.id,
      );
      expect(community).toBeTruthy();
      const numMembers = community!.memberCount;

      await api.leaveCommunity(supabase, membershipTestCommunity.id);

      community = await api.fetchCommunityById(
        supabase,
        membershipTestCommunity.id,
      );

      expect(community).toBeTruthy();
      expect(community!.memberCount).toBe(numMembers - 1);
    });
  });
});
