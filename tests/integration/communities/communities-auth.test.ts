import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import { signIn, signOut } from '@/features/auth/api';
import { createFakeCommunityData } from '@/features/communities/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityInfo } from '@/features/communities/types';
import type { User } from '@/features/users/types';

describe('Communities API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: CommunityInfo;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();
    
    // Create test data with authenticated client
    testUser = await createTestUser(authenticatedClient);
    await signIn(authenticatedClient, testUser.email, 'TestPass123!');
    
    testCommunity = await createTestCommunity(authenticatedClient);

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Read Operations', () => {
    describe('fetchCommunities', () => {
      it('allows unauthenticated access', async () => {
        const communities = await api.fetchCommunities(unauthenticatedClient);
        
        expect(Array.isArray(communities)).toBe(true);
        expect(communities.some((c) => c.id === testCommunity.id)).toBe(true);
      });

      it('allows unauthenticated access with filters', async () => {
        const communities = await api.fetchCommunities(unauthenticatedClient, {
          name: 'test',
          organizerId: testUser.id,
        });
        
        expect(Array.isArray(communities)).toBe(true);
      });
    });

    describe('fetchCommunityById', () => {
      it('allows unauthenticated access to existing community', async () => {
        const result = await api.fetchCommunityById(
          unauthenticatedClient,
          testCommunity.id,
        );
        
        expect(result).toBeTruthy();
        expect(result!.id).toBe(testCommunity.id);
        expect(result!.name).toBe(testCommunity.name);
      });

      it('returns null for non-existent community without authentication', async () => {
        const result = await api.fetchCommunityById(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );
        
        expect(result).toBeNull();
      });
    });

    describe('fetchCommunityMembers', () => {
      it('allows unauthenticated access to community members', async () => {
        const members = await api.fetchCommunityMembers(
          unauthenticatedClient,
          testCommunity.id,
        );
        
        expect(Array.isArray(members)).toBe(true);
        expect(members.some((m) => m.userId === testUser.id)).toBe(true);
      });
    });

    describe('fetchUserCommunities', () => {
      it('allows unauthenticated access to user communities', async () => {
        const communities = await api.fetchUserCommunities(
          unauthenticatedClient,
          testUser.id,
        );
        
        expect(Array.isArray(communities)).toBe(true);
        expect(communities.some((c) => c.communityId === testCommunity.id)).toBe(true);
      });
    });
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createCommunity', () => {
      it('requires authentication', async () => {
        const data = createFakeCommunityData({
          name: `${TEST_PREFIX}Unauth_Create_Test`,
        });

        await expect(
          api.createCommunity(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateCommunity', () => {
      it('requires authentication', async () => {
        await expect(
          api.updateCommunity(unauthenticatedClient, {
            id: testCommunity.id,
            name: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent community', async () => {
        await expect(
          api.updateCommunity(
            unauthenticatedClient,
            {
              id: '00000000-0000-0000-0000-000000000000',
              name: 'Test',
            },
          ),
        ).rejects.toThrow();
      });
    });

    describe('deleteCommunity', () => {
      it('requires authentication', async () => {
        await expect(
          api.deleteCommunity(unauthenticatedClient, testCommunity.id),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent community', async () => {
        await expect(
          api.deleteCommunity(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });

    describe('joinCommunity', () => {
      it('requires authentication', async () => {
        await expect(
          api.joinCommunity(unauthenticatedClient, testCommunity.id),
        ).rejects.toThrow();
      });
    });

    describe('leaveCommunity', () => {
      it('requires authentication', async () => {
        await expect(
          api.leaveCommunity(unauthenticatedClient, testCommunity.id),
        ).rejects.toThrow();
      });
    });
  });

  describe('Security Boundary Verification', () => {
    it('authenticated client can create communities', async () => {
      const data = createFakeCommunityData({
        name: `${TEST_PREFIX}Auth_Create_Test_${Date.now()}`,
      });

      const community = await api.createCommunity(authenticatedClient, data);
      expect(community).toBeTruthy();
      expect(community!.name).toBe(data.name);
    });

    it('authenticated client can update own communities', async () => {
      const newName = `${TEST_PREFIX}Auth_Update_Test_${Date.now()}`;
      
      const updated = await api.updateCommunity(
        authenticatedClient,
        {
          id: testCommunity.id,
          name: newName,
        },
      );
      
      expect(updated).toBeTruthy();
      expect(updated!.name).toBe(newName);
    });

    it('authenticated client can join and leave communities', async () => {
      // Create a second user and community
      const secondUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, secondUser.email, 'TestPass123!');
      
      // Join the existing test community
      const membership = await api.joinCommunity(
        authenticatedClient,
        testCommunity.id,
      );
      
      expect(membership).toBeTruthy();
      expect(membership!.communityId).toBe(testCommunity.id);
      expect(membership!.userId).toBe(secondUser.id);
      
      // Leave the community
      await api.leaveCommunity(authenticatedClient, testCommunity.id);
      
      // Verify membership is gone
      const members = await api.fetchCommunityMembers(
        authenticatedClient,
        testCommunity.id,
      );
      expect(members.some((m) => m.userId === secondUser.id)).toBe(false);
    });

    it('unauthenticated fetch still works after authenticated operations', async () => {
      // Verify that unauthenticated read access still works after auth operations
      const communities = await api.fetchCommunities(unauthenticatedClient);
      expect(Array.isArray(communities)).toBe(true);
      
      const community = await api.fetchCommunityById(
        unauthenticatedClient,
        testCommunity.id,
      );
      expect(community).toBeTruthy();
    });
  });
});