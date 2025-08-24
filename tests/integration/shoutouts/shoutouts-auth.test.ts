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
import { signOut } from '@/features/auth/api';
import { createFakeShoutoutInput } from '@/features/shoutouts/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';
import type { Shoutout } from '@/features/shoutouts/types';
import { joinCommunity } from '@/features/communities/api';

describe('Shoutouts API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let testResource: Resource;
  let testShoutout: Shoutout;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    testUser = await createTestUser(authenticatedClient);
    testCommunity = await createTestCommunity(authenticatedClient);
    testResource = await createTestResource(
      authenticatedClient,
      testCommunity.id,
    );

    // Create test data with authenticated client
    await createTestUser(authenticatedClient);
    await joinCommunity(authenticatedClient, testCommunity.id);

    // Create a test shoutout (testUser sends shoutout to testUser2 about testUser2's resource)
    testShoutout = await api.createShoutout(authenticatedClient, {
      resourceId: testResource.id,
      message: `${TEST_PREFIX}Test shoutout for auth tests`,
      receiverId: testUser.id,
      communityId: testCommunity.id,
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
        const data = createFakeShoutoutInput({
          resourceId: testResource.id,
          message: `${TEST_PREFIX}Unauth_Create_Test`,
        });

        await expect(
          api.createShoutout(unauthenticatedClient, {
            ...data,
            receiverId: testUser.id,
            communityId: testCommunity.id,
          }),
        ).rejects.toThrow();
      });
    });

    describe('updateShoutout', () => {
      it('should expect null for unauthenticated update', async () => {
        const result = await api.updateShoutout(unauthenticatedClient, testShoutout.id, {
          message: 'Unauthorized Update Attempt',
        });
        expect(result).toBeNull();
      });

      it('should expect null for unauthenticated update of non-existent shoutout', async () => {
        const result = await api.updateShoutout(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
          { message: 'Test' },
        );
        expect(result).toBeNull();
      });
    });

    describe('deleteShoutout', () => {
      it('should throw error for unauthenticated delete', async () => {
        await expect(
          api.deleteShoutout(unauthenticatedClient, testShoutout.id)
        ).rejects.toThrow();
      });

      it('should throw error for unauthenticated delete of non-existent shoutout', async () => {
        await expect(
          api.deleteShoutout(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          )
        ).rejects.toThrow();
      });
    });
  });
});
