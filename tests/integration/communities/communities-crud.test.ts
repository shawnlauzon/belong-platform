import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupCommunity } from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import { createFakeCommunityInput } from '@/features/communities/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { User } from '@/features/users';
import type { Account } from '@/features/auth/types';
import { parsePostGisPoint } from '@/shared';

describe('Communities API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: Account;
  let readOnlyCommunity1: Community;
  let readOnlyCommunity2: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context for community creation
    await signIn(supabase, testUser.email, 'TestPass123!');

    readOnlyCommunity1 = await createTestCommunity(supabase);
    readOnlyCommunity2 = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createCommunity', () => {
    it('creates community with valid data', async () => {
      const data = createFakeCommunityInput({
        name: `${TEST_PREFIX}Create_Test_${Date.now()}`,
      });

      let community;
      try {
        community = await api.createCommunity(supabase, data);

        expect(community).toBeTruthy();
        expect(community!.id).toBeTruthy();
        expect(community!.name).toBe(data.name);
        expect(community!.organizerId).toBe(testUser.id);

        // Verify database record exists with all expected fields
        const { data: dbRecord } = await supabase
          .from('communities')
          .select('*')
          .eq('id', community!.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: community!.id,
          name: data.name,
          description: data.description,
          organizer_id: testUser.id,
          time_zone: data.timeZone,
          icon: data.icon,
          boundary: data.boundary,
          member_count: 1,
        });
        expect(parsePostGisPoint(dbRecord!.center)).toEqual(data.center);
        expect(dbRecord!.created_at).toBeTruthy();
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupCommunity(community);
      }
    });

    it('auto-creates organizer membership', async () => {
      const data = createFakeCommunityInput({
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
        await cleanupCommunity(community);
      }
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
          createFakeCommunityInput({
            name: uniqueName,
          }),
        );

        const filtered = await api.fetchCommunities(supabase, {
          name: 'UniqueFilter',
        });

        expect(filtered.some((c) => c.name === uniqueName)).toBe(true);
      } finally {
        await cleanupCommunity(filteredCommunity);
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
        community = await createTestCommunity(supabase);

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

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('communities')
          .select('*')
          .eq('id', community.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: community.id,
          name: newName,
          description: newDescription,
          organizer_id: community.organizerId,
          time_zone: community.timeZone,
          icon: community.icon,
          boundary: community.boundary,
        });
        expect(dbRecord!.center).toBeTruthy();
      } finally {
        await cleanupCommunity(community);
      }
    });

    it('preserves unchanged fields', async () => {
      let community;
      try {
        community = await createTestCommunity(supabase);
        const newName = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
        const originalDescription = community.description;

        const updated = await api.updateCommunity(supabase, {
          id: community.id,
          name: newName,
        });

        expect(updated!.name).toBe(newName);
        expect(updated!.description).toBe(originalDescription);
        expect(updated!.organizerId).toBe(community.organizerId);

        // Verify database record preserves unchanged fields
        const { data: dbRecord } = await supabase
          .from('communities')
          .select('*')
          .eq('id', community.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: community.id,
          name: newName,
          description: originalDescription,
          organizer_id: community.organizerId,
          time_zone: community.timeZone,
          icon: community.icon,
          boundary: community.boundary,
        });
        expect(dbRecord!.center).toBeTruthy();
      } finally {
        await cleanupCommunity(community);
      }
    });

    it('updates community boundary data', async () => {
      let community;
      try {
        community = await createTestCommunity(supabase);

        // Define new boundary data that's different from the initial
        const fakeCommunityData = createFakeCommunityInput();

        // This should trigger the boundary constraint violation
        // because forDbUpdate doesn't update boundary_geometry
        const updated = await api.updateCommunity(supabase, {
          id: community.id,
          boundary: fakeCommunityData.boundary,
        });

        expect(updated).toBeTruthy();
        expect(updated!.boundary).toEqual(fakeCommunityData.boundary);

        // Verify database record has both fields updated consistently
        const { data: dbRecord } = await supabase
          .from('communities')
          .select('*')
          .eq('id', community.id)
          .single();

        expect(dbRecord!.boundary).toEqual(fakeCommunityData.boundary);
        expect(dbRecord!.boundary_geometry).toBeTruthy();
      } finally {
        await cleanupCommunity(community);
      }
    });
  });

  describe('deleteCommunity', () => {
    it('deletes community and cascades to memberships', async () => {
      // Create a community specifically for deletion
      const community = await createTestCommunity(supabase);
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
