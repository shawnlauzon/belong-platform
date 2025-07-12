import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupResource } from '../helpers/cleanup';
import * as api from '@/features/resources/api';
import { signIn } from '@/features/auth/api';
import { Resource, ResourceCategory } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { createFakeResourceInput } from '@/features/resources/__fakes__';
import { Community } from '@/features/communities/types';

describe('Resources API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let readOnlyResource1: Resource;
  let readOnlyResource2: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);

    // Create test resources
    readOnlyResource1 = await createTestResource(supabase, testCommunity.id);
    readOnlyResource2 = await createTestResource(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createResource', () => {
    it('creates resource with valid data', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        communityId: testCommunity.id,
      });

      let resource;
      try {
        resource = await api.createResource(supabase, data);
        expect(resource).toMatchObject({
          id: expect.any(String),
          title: data.title,
          ownerId: testUser.id,
          communityId: testCommunity.id,
          type: data.type,
          category: data.category,
        });

        // Verify database record exists with all expected fields
        const { data: dbRecord } = await supabase
          .from('resources')
          .select('*')
          .eq('id', resource.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: resource.id,
          title: data.title,
          owner_id: testUser.id,
          community_id: testCommunity.id,
          type: data.type,
          category: data.category,
          description: data.description,
        });
        expect(dbRecord!.created_at).toBeTruthy();
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupResource(resource);
      }
    });
  });

  describe('fetchResources', () => {
    it('fetches all resources', async () => {
      const resources = await api.fetchResources(supabase);

      expect(Array.isArray(resources)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyResource1.id)).toBe(true);
      expect(resources.some((r) => r.id === readOnlyResource2.id)).toBe(true);
    });

    it('filters by category', async () => {
      let testResource;
      try {
        testResource = await api.createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Filter_Category_${Date.now()}`,
            communityId: testCommunity.id,
            category: ResourceCategory.TOOLS,
          }),
        );

        const filtered = await api.fetchResources(supabase, {
          category: 'tools',
        });

        expect(filtered.some((r) => r.id === testResource!.id)).toBe(true);
        expect(filtered.every((r) => r.category === 'tools')).toBe(true);
      } finally {
        await cleanupResource(testResource);
      }
    });

    it('filters by type', async () => {
      let testResource;
      try {
        testResource = await api.createResource(
          supabase,
          createFakeResourceInput({
            title: `${TEST_PREFIX}Filter_Type_${Date.now()}`,
            communityId: testCommunity.id,
            type: 'offer',
          }),
        );

        const filtered = await api.fetchResources(supabase, {
          type: 'offer',
        });

        expect(filtered.some((r) => r.id === testResource!.id)).toBe(true);
        expect(filtered.every((r) => r.type === 'offer')).toBe(true);
      } finally {
        await cleanupResource(testResource);
      }
    });

    it('filters by communityId', async () => {
      const filtered = await api.fetchResources(supabase, {
        communityId: testCommunity.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((r) => r.communityId === testCommunity.id)).toBe(
        true,
      );
    });

    it('filters by ownerId', async () => {
      const filtered = await api.fetchResources(supabase, {
        ownerId: testUser.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((r) => r.ownerId === testUser.id)).toBe(true);
    });

    it('filters by searchTerm', async () => {
      const uniqueTitle = `${TEST_PREFIX}UniqueSearch_${Date.now()}`;
      let testResource;

      try {
        testResource = await api.createResource(
          supabase,
          createFakeResourceInput({
            title: uniqueTitle,
            communityId: testCommunity.id,
          }),
        );

        const filtered = await api.fetchResources(supabase, {
          searchTerm: 'UniqueSearch',
        });

        expect(filtered.some((r) => r.title === uniqueTitle)).toBe(true);
      } finally {
        await cleanupResource(testResource);
      }
    });
  });

  describe('updateResource', () => {
    it('updates resource fields', async () => {
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id);

        const newTitle = `${TEST_PREFIX}Updated_${Date.now()}`;
        const newDescription = 'Updated description for test';

        const updated = await api.updateResource(supabase, {
          id: resource.id,
          title: newTitle,
          description: newDescription,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(newDescription);
        expect(updated!.id).toBe(resource.id);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('resources')
          .select('*')
          .eq('id', resource.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: resource.id,
          title: newTitle,
          description: newDescription,
          owner_id: resource.ownerId,
          community_id: resource.communityId,
          type: resource.type,
          category: resource.category,
        });
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupResource(resource);
      }
    });

    it('preserves unchanged fields', async () => {
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id);

        const newTitle = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
        const originalDescription = resource.description;

        const updated = await api.updateResource(supabase, {
          id: resource.id,
          title: newTitle,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(originalDescription);
        expect(updated!.ownerId).toBe(resource.ownerId);
        expect(updated!.communityId).toBe(resource.communityId);
      } finally {
        await cleanupResource(resource);
      }
    });

    it('updates category and type', async () => {
      let resource;
      try {
        resource = await createTestResource(supabase, testCommunity.id);

        const updated = await api.updateResource(supabase, {
          id: resource.id,
          category: ResourceCategory.FOOD,
          type: 'request',
        });

        expect(updated!.category).toBe(ResourceCategory.FOOD);
        expect(updated!.type).toBe('request');
      } finally {
        await cleanupResource(resource);
      }
    });
  });

  describe('deleteResource', () => {
    it('deletes resource successfully', async () => {
      // Create a resource specifically for deletion
      const resource = await createTestResource(supabase, testCommunity.id);
      const resourceId = resource.id;

      // Verify resource exists before deletion
      const beforeDelete = await api.fetchResourceById(supabase, resourceId);
      expect(beforeDelete).toBeTruthy();

      // Delete resource - this should complete without error
      await api.deleteResource(supabase, resourceId);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify resource deleted
      const { data, error } = await supabase
        .from('resources')
        .select()
        .eq('id', resourceId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });

    it('does not throw error when deleting non-existent resource', async () => {
      // SQL DELETE operations don't fail when no rows match - this is expected behavior
      await expect(
        api.deleteResource(supabase, '00000000-0000-0000-0000-000000000000'),
      ).resolves.not.toThrow();
    });
  });

  describe('fetchResourceById', () => {
    it('returns resource by id', async () => {
      const fetched = await api.fetchResourceById(
        supabase,
        readOnlyResource1.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyResource1.id);
      expect(fetched!.title).toBe(readOnlyResource1.title);
    });

    it('returns null for non-existent id', async () => {
      const result = await api.fetchResourceById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });
});
