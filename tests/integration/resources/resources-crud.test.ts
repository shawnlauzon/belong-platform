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
import { signIn, signOut } from '@/features/auth/api';
import { createFakeResourceData } from '@/features/resources/__fakes__';
import { ResourceCategory } from '@/features/resources/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInfo } from '@/features/resources/types';
import type { User } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';

describe('Resources API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: CommunityInfo;
  let readOnlyResource1: ResourceInfo;
  let readOnlyResource2: ResourceInfo;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);

    // Create test resources
    readOnlyResource1 = await createTestResource(
      supabase,
      testUser.id,
      testCommunity.id,
    );
    readOnlyResource2 = await createTestResource(
      supabase,
      testUser.id,
      testCommunity.id,
    );
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createResource', () => {
    it('creates resource with valid data', async () => {
      const data = createFakeResourceData({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        communityId: testCommunity.id,
      });

      let resource;
      try {
        resource = await api.createResource(supabase, data);

        expect(resource).toBeTruthy();
        expect(resource!.id).toBeTruthy();
        expect(resource!.title).toBe(data.title);
        expect(resource!.ownerId).toBe(testUser.id);
        expect(resource!.communityId).toBe(testCommunity.id);
        expect(resource!.type).toBe(data.type);
        expect(resource!.category).toBe(data.category);
      } finally {
        await cleanupResource(resource);
      }
    });

    it('creates resource with all categories', async () => {
      const categories = [
        ResourceCategory.TOOLS,
        ResourceCategory.SKILLS,
        ResourceCategory.FOOD,
        ResourceCategory.SUPPLIES,
        ResourceCategory.OTHER,
      ];

      const resources = [];
      try {
        for (const category of categories) {
          const data = createFakeResourceData({
            title: `${TEST_PREFIX}Category_${category}_${Date.now()}`,
            communityId: testCommunity.id,
            category,
          });

          const resource = await api.createResource(supabase, data);
          expect(resource!.category).toBe(category);
          resources.push(resource);
        }
      } finally {
        for (const resource of resources) {
          await cleanupResource(resource);
        }
      }
    });

    it('creates resource with both offer and request types', async () => {
      const types = ['offer', 'request'] as const;
      const resources = [];

      try {
        for (const type of types) {
          const data = createFakeResourceData({
            title: `${TEST_PREFIX}Type_${type}_${Date.now()}`,
            communityId: testCommunity.id,
            type,
          });

          const resource = await api.createResource(supabase, data);
          expect(resource!.type).toBe(type);
          resources.push(resource);
        }
      } finally {
        for (const resource of resources) {
          await cleanupResource(resource);
        }
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
          createFakeResourceData({
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
          createFakeResourceData({
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
          createFakeResourceData({
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
        resource = await createTestResource(
          supabase,
          testUser.id,
          testCommunity.id,
        );

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
      } finally {
        await cleanupResource(resource);
      }
    });

    it('preserves unchanged fields', async () => {
      let resource;
      try {
        resource = await createTestResource(
          supabase,
          testUser.id,
          testCommunity.id,
        );

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
        resource = await createTestResource(
          supabase,
          testUser.id,
          testCommunity.id,
        );

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
      const resource = await createTestResource(
        supabase,
        testUser.id,
        testCommunity.id,
      );
      const resourceId = resource.id;

      // Verify resource exists before deletion
      const beforeDelete = await api.fetchResourceInfoById(
        supabase,
        resourceId,
      );
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

  describe('fetchResourceInfoById', () => {
    it('returns resource by id', async () => {
      const fetched = await api.fetchResourceInfoById(
        supabase,
        readOnlyResource1.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyResource1.id);
      expect(fetched!.title).toBe(readOnlyResource1.title);
    });

    it('returns null for non-existent id', async () => {
      const result = await api.fetchResourceInfoById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });
});
