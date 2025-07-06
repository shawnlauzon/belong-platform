import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupCommunity,
} from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { createFakeCommunityData } from '@/features/communities/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityInfo } from '@/features/communities/types';
import type { User } from '@/features/users/types';

describe('Communities API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let readOnlyCommunity1: CommunityInfo;
  let readOnlyCommunity2: CommunityInfo;

  beforeAll(async () => {
    supabase = createTestClient();
    await cleanupAllTestData(supabase);

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);
    readOnlyCommunity1 = await createTestCommunity(supabase, testUser.id);
    readOnlyCommunity2 = await createTestCommunity(supabase, testUser.id);
  });

  afterAll(async () => {
    await cleanupAllTestData(supabase);
  });

  describe('createCommunity', () => {
    it('creates community with valid data', async () => {
      const data = createFakeCommunityData({
        organizerId: testUser.id,
        name: `${TEST_PREFIX}Create_Test_${Date.now()}`,
      });

      let community;
      try {
        community = await api.createCommunity(supabase, data);

        expect(community).toBeTruthy();
        expect(community!.id).toBeTruthy();
        expect(community!.name).toBe(data.name);
        expect(community!.organizerId).toBe(testUser.id);
      } finally {
        await cleanupCommunity(supabase, community);
      }
    });

    it('auto-creates organizer membership', async () => {
      const data = createFakeCommunityData({
        organizerId: testUser.id,
        name: `${TEST_PREFIX}Membership_Test_${Date.now()}`,
      });

      let community;
      try {
        community = await api.createCommunity(supabase, data);

        const { data: membership } = await supabase
          .from('community_memberships')
          .select()
          .eq('community_id', community!.id)
          .eq('user_id', testUser.id)
          .single();

        expect(membership).toBeTruthy();
      } finally {
        await cleanupCommunity(supabase, community);
      }
    });

    it('fails without valid organizer', async () => {
      const data = createFakeCommunityData({
        organizerId: 'invalid-user-id',
        name: `${TEST_PREFIX}Invalid_Test_${Date.now()}`,
      });

      await expect(api.createCommunity(supabase, data)).rejects.toThrow();
    });
  });

  describe('fetchCommunities', () => {
    it('fetches all communities', async () => {
      const communities = await api.fetchCommunities(supabase);

      expect(Array.isArray(communities)).toBe(true);
      expect(communities.some((c) => c.id === readOnlyCommunity1.id)).toBe(
        true,
      );
      expect(communities.some((c) => c.id === readOnlyCommunity2.id)).toBe(
        true,
      );
    });

    it('filters by name', async () => {
      const uniqueName = `${TEST_PREFIX}UniqueFilter_${Date.now()}`;
      let filteredCommunity;

      try {
        filteredCommunity = await api.createCommunity(
          supabase,
          createFakeCommunityData({
            name: uniqueName,
            organizerId: testUser.id,
          }),
        );

        const filtered = await api.fetchCommunities(supabase, {
          name: 'UniqueFilter',
        });

        expect(filtered.some((c) => c.name === uniqueName)).toBe(true);
      } finally {
        await cleanupCommunity(supabase, filteredCommunity);
      }
    });

    it('filters by organizerId', async () => {
      const filtered = await api.fetchCommunities(supabase, {
        organizerId: testUser.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((c) => c.organizerId === testUser.id)).toBe(true);
    });
  });

  describe('fetchCommunityById', () => {
    it('returns community by id', async () => {
      const fetched = await api.fetchCommunityById(
        supabase,
        readOnlyCommunity1.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyCommunity1.id);
      expect(fetched!.name).toBe(readOnlyCommunity1.name);
    });

    it('returns null for non-existent id', async () => {
      // Use a valid UUID format that doesn't exist
      const result = await api.fetchCommunityById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateCommunity', () => {
    it('updates community fields', async () => {
      // Create own community to modify
      let community;
      try {
        community = await createTestCommunity(supabase, testUser.id);

        const newName = `${TEST_PREFIX}Updated_${Date.now()}`;
        const newDescription = 'Updated description for test';

        const updated = await api.updateCommunity(supabase, {
          id: community.id,
          name: newName,
          description: newDescription,
        });

        expect(updated!.name).toBe(newName);
        expect(updated!.description).toBe(newDescription);
        expect(updated!.id).toBe(community.id);
      } finally {
        await cleanupCommunity(supabase, community);
      }
    });

    it('preserves unchanged fields', async () => {
      let community;
      try {
        community = await createTestCommunity(supabase, testUser.id);
        const newName = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
        const originalDescription = community.description;

        const updated = await api.updateCommunity(supabase, {
          id: community.id,
          name: newName,
        });

        expect(updated!.name).toBe(newName);
        expect(updated!.description).toBe(originalDescription);
        expect(updated!.organizerId).toBe(community.organizerId);
      } finally {
        await cleanupCommunity(supabase, community);
      }
    });
  });

  describe('deleteCommunity', () => {
    it('deletes community and cascades to memberships', async () => {
      // Create a community specifically for deletion
      const community = await createTestCommunity(supabase, testUser.id);
      const communityId = community.id;

      // Join another user to test cascade
      const user2 = await createTestUser(supabase);
      const user2Email = user2.email;

      // Sign in as user2 and join the community
      await signIn(supabase, user2Email, 'TestPass123!');
      await api.joinCommunity(supabase, communityId);

      // Sign back in as the owner to delete
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Delete community
      await api.deleteCommunity(supabase, communityId);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify community deleted
      const { data, error } = await supabase
        .from('communities')
        .select()
        .eq('id', communityId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify memberships deleted
      const { data: memberships } = await supabase
        .from('community_memberships')
        .select()
        .eq('community_id', communityId);

      expect(memberships).toHaveLength(0);

      // Note: community already deleted, user2 will be cleaned in afterAll
    });
  });
});