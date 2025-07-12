import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/resources/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import { Resource } from '@/features';
import { createFakeResourceInput } from '@/features/resources/__fakes__';

describe('Resources API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let testResource: Resource;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    // Create test data with authenticated client
    testUser = await createTestUser(authenticatedClient);
    await signIn(authenticatedClient, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(authenticatedClient);
    testResource = await createTestResource(
      authenticatedClient,
      testCommunity.id,
    );

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Read Operations', () => {
    describe('fetchResources', () => {
      it('allows unauthenticated access', async () => {
        const resources = await api.fetchResources(unauthenticatedClient);

        expect(Array.isArray(resources)).toBe(true);
        expect(resources.some((r) => r.id === testResource.id)).toBe(true);
      });

      it('allows unauthenticated access with filters', async () => {
        const resources = await api.fetchResources(unauthenticatedClient, {
          category: 'tools',
          type: 'offer',
          communityId: testCommunity.id,
        });

        expect(Array.isArray(resources)).toBe(true);
      });

      it('allows search without authentication', async () => {
        const resources = await api.fetchResources(unauthenticatedClient, {
          searchTerm: 'test',
        });

        expect(Array.isArray(resources)).toBe(true);
      });
    });

    describe('fetchResourceById', () => {
      it('allows unauthenticated access to existing resource', async () => {
        const result = await api.fetchResourceById(
          unauthenticatedClient,
          testResource.id,
        );

        expect(result).toBeTruthy();
        expect(result!.id).toBe(testResource.id);
        expect(result!.title).toBe(testResource.title);
      });

      it('returns null for non-existent resource without authentication', async () => {
        const result = await api.fetchResourceById(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );

        expect(result).toBeNull();
      });
    });
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createResource', () => {
      it('requires authentication', async () => {
        const data = createFakeResourceInput({
          title: `${TEST_PREFIX}Unauth_Create_Test`,
          communityId: testCommunity.id,
        });

        await expect(
          api.createResource(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateResource', () => {
      it('requires authentication', async () => {
        await expect(
          api.updateResource(unauthenticatedClient, {
            id: testResource.id,
            title: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent resource', async () => {
        await expect(
          api.updateResource(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            title: 'Test',
          }),
        ).rejects.toThrow();
      });
    });

    describe('deleteResource', () => {
      it('requires authentication', async () => {
        await expect(
          api.deleteResource(unauthenticatedClient, testResource.id),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent resource', async () => {
        await expect(
          api.deleteResource(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });
  });

  describe('Security Boundary Verification', () => {
    it('authenticated client can create resources', async () => {
      const data = createFakeResourceInput({
        title: `${TEST_PREFIX}Auth_Create_Test_${Date.now()}`,
        communityId: testCommunity.id,
      });

      const resource = await api.createResource(authenticatedClient, data);
      expect(resource).toBeTruthy();
      expect(resource!.title).toBe(data.title);
    });

    it('authenticated client can update own resources', async () => {
      const newTitle = `${TEST_PREFIX}Auth_Update_Test_${Date.now()}`;

      const updated = await api.updateResource(authenticatedClient, {
        id: testResource.id,
        title: newTitle,
      });

      expect(updated).toBeTruthy();
      expect(updated!.title).toBe(newTitle);
    });

    it('unauthenticated fetch still works after authenticated operations', async () => {
      // Verify that unauthenticated read access still works after auth operations
      const resources = await api.fetchResources(unauthenticatedClient);
      expect(Array.isArray(resources)).toBe(true);

      const resource = await api.fetchResourceById(
        unauthenticatedClient,
        testResource.id,
      );
      expect(resource).toBeTruthy();
    });
  });
});
