import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/shoutouts/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';
import type { Shoutout } from '@/features/shoutouts/types';
import { joinCommunity } from '@/features/communities/api';
import { Account } from '@/features';

describe('Shoutouts API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: Account;
  let testCommunity: Community;
  let testResource: Resource;
  let testShoutout: Shoutout;
  let anotherUser: Account;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    testUser = await createTestUser(authenticatedClient);
    testCommunity = await createTestCommunity(authenticatedClient);
    testResource = await createTestResource(
      authenticatedClient,
      testCommunity.id,
    );

    anotherUser = await createTestUser(authenticatedClient);
    await joinCommunity(authenticatedClient, anotherUser.id, testCommunity.id);

    // Create a test shoutout (testUser sends shoutout about testResource)
    testShoutout = await api.createShoutout(authenticatedClient, testUser.id, {
      resourceId: testResource.id,
      message: `${TEST_PREFIX}Test shoutout for auth tests`,
    });

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createShoutout', () => {
      it('requires authentication', async () => {
        const data = {
          resourceId: testResource.id,
          message: `${TEST_PREFIX}Unauth_Create_Test`,
        };

        await expect(
          api.createShoutout(unauthenticatedClient, testUser.id, data),
        ).rejects.toThrow();
      });
    });

    describe('updateShoutout', () => {
      it('should throw error for unauthenticated update', async () => {
        await expect(
          api.updateShoutout(
            unauthenticatedClient,
            'unauthenticated-test-id',
            {
              id: testShoutout.id,
              message: 'Unauthorized Update Attempt',
            },
          ),
        ).rejects.toThrow();
      });

      it('should throw error for unauthenticated update of non-existent shoutout', async () => {
        await expect(
          api.updateShoutout(
            unauthenticatedClient,
            'unauthenticated-test-id',
            {
              id: '00000000-0000-0000-0000-000000000000',
              message: 'Test',
            },
          ),
        ).rejects.toThrow();
      });
    });

    describe('deleteShoutout', () => {
      it('should throw error for unauthenticated delete', async () => {
        await expect(
          api.deleteShoutout(
            unauthenticatedClient,
            testUser.id,
            testShoutout.id,
          ),
        ).rejects.toThrow();
      });

      it('should throw error for unauthenticated delete of non-existent shoutout', async () => {
        await expect(
          api.deleteShoutout(
            unauthenticatedClient,
            testUser.id,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });
  });
});
