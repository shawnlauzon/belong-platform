import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  TEST_PREFIX,
} from '../helpers/test-data';
import { 
  cleanupAllTestData, 
  cleanupResource, 
  cleanupUser,
  cleanupResourceResponses
} from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import * as communitiesApi from '@/features/communities/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { ResourceInfo } from '@/features/resources/types';
import type { UserDetail } from '@/features/users/types';
import type { CommunityInfo } from '@/features/communities/types';
import type { ResourceResponseStatus } from '@/features/resources/types';

describe('Resources API - Accept/Decline Response Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser1: UserDetail;
  let testUser2: UserDetail;
  let testCommunity: CommunityInfo;
  let testResource: ResourceInfo;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create test users
    testUser1 = await createTestUser(supabase);
    testUser2 = await createTestUser(supabase);

    // Sign in as testUser1 to create community and resource
    await signIn(supabase, testUser1.email, 'TestPass123!');

    // Create community and resource
    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(
      supabase,
      testUser1.id,
      testCommunity.id,
    );

    // Join testUser2 to the community so they can respond to resources
    await signIn(supabase, testUser2.email, 'TestPass123!');
    await communitiesApi.joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  // Clean up any response records before each test
  beforeEach(async () => {
    // Clean up any existing resource responses for the test resource
    await cleanupResourceResponses(testResource.id);
  });

  describe('acceptResource', () => {
    beforeEach(async () => {
      // Sign in as testUser2 for response operations
      await signIn(supabase, testUser2.email, 'TestPass123!');
    });

    it('accepts resource with default "accepted" status', async () => {
      const response = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
      );

      expect(response).toBeTruthy();
      expect(response.resourceId).toBe(testResource.id);
      expect(response.userId).toBe(testUser2.id);
      expect(response.status).toBe('accepted');
      expect(response.createdAt).toBeInstanceOf(Date);
      expect(response.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('accepted');
    });

    it('accepts resource with "interested" status', async () => {
      const response = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );

      expect(response).toBeTruthy();
      expect(response.resourceId).toBe(testResource.id);
      expect(response.userId).toBe(testUser2.id);
      expect(response.status).toBe('interested');

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('interested');
    });

    it('prevents duplicate acceptance with same status', async () => {
      // First acceptance
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');

      // Second acceptance with same status should fail
      await expect(
        resourcesApi.acceptResource(supabase, testResource.id, 'accepted'),
      ).rejects.toThrow();
    });

    it('allows status change from accepted to interested', async () => {
      // First accept as 'accepted'
      const firstResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(firstResponse.status).toBe('accepted');

      // Change to 'interested' (should upsert)
      const secondResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(secondResponse.status).toBe('interested');
      expect(secondResponse.resourceId).toBe(testResource.id);
      expect(secondResponse.userId).toBe(testUser2.id);

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('interested');
    });

    it('allows status change from interested to accepted', async () => {
      // First accept as 'interested'
      const firstResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(firstResponse.status).toBe('interested');

      // Change to 'accepted' (should upsert)
      const secondResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(secondResponse.status).toBe('accepted');
      expect(secondResponse.resourceId).toBe(testResource.id);
      expect(secondResponse.userId).toBe(testUser2.id);

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('accepted');
    });

    it('fails with invalid resource id', async () => {
      await expect(
        resourcesApi.acceptResource(supabase, 'invalid-resource-id'),
      ).rejects.toThrow();
    });

    it('fails when user is not authenticated', async () => {
      await signOut(supabase);

      await expect(
        resourcesApi.acceptResource(supabase, testResource.id),
      ).rejects.toThrow();
    });

    it('fails when user is not a community member', async () => {
      // Create a user who is not a member of the community
      const nonMemberUser = await createTestUser(supabase);
      await signIn(supabase, nonMemberUser.email, 'TestPass123!');

      try {
        // Should fail due to RLS policy requiring community membership
        await expect(
          resourcesApi.acceptResource(supabase, testResource.id),
        ).rejects.toThrow(/row-level security policy/);
      } finally {
        await cleanupUser(nonMemberUser.id);
      }
    });

    it('allows different users to accept same resource', async () => {
      // testUser2 accepts resource
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');

      // Switch to testUser1 - but testUser1 is the resource owner, so use a third user
      const testUser3 = await createTestUser(supabase);
      await signIn(supabase, testUser3.email, 'TestPass123!');

      try {
        // testUser3 must join the community first to respond to resources
        await communitiesApi.joinCommunity(supabase, testCommunity.id);

        // testUser3 should be able to accept the same resource
        const response = await resourcesApi.acceptResource(
          supabase,
          testResource.id,
          'interested',
        );

        expect(response.userId).toBe(testUser3.id);
        expect(response.status).toBe('interested');

        // Verify both records exist
        const { data: allResponses } = await supabase
          .from('resource_responses')
          .select('*')
          .eq('resource_id', testResource.id);

        expect(allResponses).toHaveLength(2);
        expect(allResponses?.some(r => r.user_id === testUser2.id && r.status === 'accepted')).toBe(true);
        expect(allResponses?.some(r => r.user_id === testUser3.id && r.status === 'interested')).toBe(true);
      } finally {
        await cleanupUser(testUser3.id);
      }
    });
  });

  describe('declineResource', () => {
    beforeEach(async () => {
      // Sign in as testUser2 for response operations
      await signIn(supabase, testUser2.email, 'TestPass123!');
    });

    it('declines resource with "declined" status', async () => {
      const response = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );

      expect(response).toBeTruthy();
      expect(response.resourceId).toBe(testResource.id);
      expect(response.userId).toBe(testUser2.id);
      expect(response.status).toBe('declined');
      expect(response.createdAt).toBeInstanceOf(Date);
      expect(response.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id)
        .maybeSingle();

      expect(dbRecord).toBeTruthy();
      expect(dbRecord!.status).toBe('declined');
    });

    it('allows decline after previous acceptance (upsert behavior)', async () => {
      // First accept resource
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');

      // Then decline (should upsert)
      const declineResponse = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );

      expect(declineResponse.status).toBe('declined');

      // Verify only one record exists with declined status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('declined');
    });

    it('allows decline after previous interest (upsert behavior)', async () => {
      // First show interest
      await resourcesApi.acceptResource(supabase, testResource.id, 'interested');

      // Then decline (should upsert)
      const declineResponse = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );

      expect(declineResponse.status).toBe('declined');

      // Verify only one record exists with declined status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('declined');
    });

    it('fails with invalid resource id', async () => {
      await expect(
        resourcesApi.declineResource(supabase, 'invalid-resource-id'),
      ).rejects.toThrow();
    });

    it('fails when user is not authenticated', async () => {
      await signOut(supabase);

      await expect(
        resourcesApi.declineResource(supabase, testResource.id),
      ).rejects.toThrow();
    });

    it('fails when user is not a community member', async () => {
      // Create a user who is not a member of the community
      const nonMemberUser = await createTestUser(supabase);
      await signIn(supabase, nonMemberUser.email, 'TestPass123!');

      try {
        // Should fail due to RLS policy requiring community membership
        await expect(
          resourcesApi.declineResource(supabase, testResource.id),
        ).rejects.toThrow(/row-level security policy/);
      } finally {
        await cleanupUser(nonMemberUser.id);
      }
    });
  });

  describe('fetchResourceResponses', () => {
    beforeEach(async () => {
      // Sign in as testUser2 and create some test responses
      await signIn(supabase, testUser2.email, 'TestPass123!');
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');
    });

    it('fetches responses by resource id', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        resourceId: testResource.id,
      });

      expect(responses).toHaveLength(1);
      expect(responses[0].resourceId).toBe(testResource.id);
      expect(responses[0].userId).toBe(testUser2.id);
      expect(responses[0].status).toBe('accepted');
    });

    it('fetches responses by user id', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        userId: testUser2.id,
      });

      expect(responses.length).toBeGreaterThanOrEqual(1);
      expect(responses.every(r => r.userId === testUser2.id)).toBe(true);
    });

    it('fetches responses by status filter', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        status: 'accepted' as ResourceResponseStatus,
      });

      expect(responses.length).toBeGreaterThanOrEqual(1);
      expect(responses.every(r => r.status === 'accepted')).toBe(true);
    });

    it('fetches responses with multiple filters', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        resourceId: testResource.id,
        userId: testUser2.id,
        status: 'accepted' as ResourceResponseStatus,
      });

      expect(responses).toHaveLength(1);
      expect(responses[0].resourceId).toBe(testResource.id);
      expect(responses[0].userId).toBe(testUser2.id);
      expect(responses[0].status).toBe('accepted');
    });

    it('returns empty array for non-existent resource', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        resourceId: '00000000-0000-0000-0000-000000000000',
      });

      expect(responses).toHaveLength(0);
    });

    it('returns empty array for non-existent user', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        userId: '00000000-0000-0000-0000-000000000000',
      });

      expect(responses).toHaveLength(0);
    });
  });

  describe('Real-World Workflow Tests', () => {
    beforeEach(async () => {
      await signIn(supabase, testUser2.email, 'TestPass123!');
    });

    it('handles accept → decline → accept workflow', async () => {
      // Accept resource
      const acceptResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(acceptResponse.status).toBe('accepted');

      // Decline resource
      const declineResponse = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );
      expect(declineResponse.status).toBe('declined');

      // Accept again with different status
      const reacceptResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(reacceptResponse.status).toBe('interested');

      // Verify only one record exists with final status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('interested');
    });

    it('handles accepted → interested → accepted workflow', async () => {
      // Accept as 'accepted'
      const firstResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(firstResponse.status).toBe('accepted');

      // Change to 'interested'
      const secondResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(secondResponse.status).toBe('interested');

      // Change back to 'accepted'
      const thirdResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(thirdResponse.status).toBe('accepted');

      // Verify only one record exists with final status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', testUser2.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('accepted');
    });

    it('handles multiple users responding to same resource', async () => {
      // testUser2 accepts resource
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');

      // Create and use testUser3
      const testUser3 = await createTestUser(supabase);
      await signIn(supabase, testUser3.email, 'TestPass123!');

      try {
        // testUser3 must join community first
        await communitiesApi.joinCommunity(supabase, testCommunity.id);

        // testUser3 shows interest
        await resourcesApi.acceptResource(supabase, testResource.id, 'interested');

        // testUser3 declines
        await resourcesApi.declineResource(supabase, testResource.id);

        // Verify both users' final responses
        const allResponses = await resourcesApi.fetchResourceResponses(supabase, {
          resourceId: testResource.id,
        });

        expect(allResponses).toHaveLength(2);
        
        const user2Response = allResponses.find(r => r.userId === testUser2.id);
        const user3Response = allResponses.find(r => r.userId === testUser3.id);

        expect(user2Response?.status).toBe('accepted');
        expect(user3Response?.status).toBe('declined');
      } finally {
        await cleanupUser(testUser3.id);
      }
    });
  });
});