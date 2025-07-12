import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupResourceResponses,
} from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import * as communitiesApi from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Resource } from '@/features/resources/types';

describe('Resources API - Accept/Decline Response Operations', () => {
  let supabase: SupabaseClient<Database>;
  let resourceOwner: User;
  let communityMember: User;
  let testCommunity: Community;
  let testResource: Resource;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create resource owner and setup
    resourceOwner = await createTestUser(supabase);
    await signIn(supabase, resourceOwner.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    testResource = await createTestResource(supabase, testCommunity.id);

    // Create community member who will respond to resources
    communityMember = await createTestUser(supabase);
    await signIn(supabase, communityMember.email, 'TestPass123!');
    await communitiesApi.joinCommunity(supabase, testCommunity.id);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  afterEach(async () => {
    await cleanupResourceResponses(testResource.id);
  });

  describe('acceptResource', () => {
    it('accepts resource with default "accepted" status', async () => {
      const response = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
      );

      expect(response).toBeTruthy();
      expect(response?.resourceId).toBe(testResource.id);
      expect(response?.userId).toBe(communityMember.id);
      expect(response?.status).toBe('accepted');
      expect(response?.createdAt).toBeInstanceOf(Date);
      expect(response?.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
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
      expect(response?.resourceId).toBe(testResource.id);
      expect(response?.userId).toBe(communityMember.id);
      expect(response?.status).toBe('interested');

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
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
      expect(firstResponse?.status).toBe('accepted');

      // Change to 'interested' (should upsert)
      const secondResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(secondResponse?.status).toBe('interested');
      expect(secondResponse?.resourceId).toBe(testResource.id);
      expect(secondResponse?.userId).toBe(communityMember.id);

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

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
      expect(firstResponse?.status).toBe('interested');

      // Change to 'accepted' (should upsert)
      const secondResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(secondResponse?.status).toBe('accepted');
      expect(secondResponse?.resourceId).toBe(testResource.id);
      expect(secondResponse?.userId).toBe(communityMember.id);

      // Verify only one record exists with updated status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('accepted');
    });

    it('fails with invalid resource id', async () => {
      await expect(
        resourcesApi.acceptResource(supabase, 'invalid-resource-id'),
      ).rejects.toThrow();
    });

    it('resource owner cannot respond to own resource', async () => {
      // Switch to resource owner
      await signIn(supabase, resourceOwner.email, 'TestPass123!');

      try {
        await resourcesApi.acceptResource(supabase, testResource.id);
      } finally {
        // Switch back to community member
        await signIn(supabase, communityMember.email, 'TestPass123!');
      }
    });
  });

  describe('declineResource', () => {
    it('declines resource with "declined" status', async () => {
      const response = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );

      expect(response).toBeTruthy();
      expect(response?.resourceId).toBe(testResource.id);
      expect(response?.userId).toBe(communityMember.id);
      expect(response?.status).toBe('declined');
      expect(response?.createdAt).toBeInstanceOf(Date);
      expect(response?.updatedAt).toBeInstanceOf(Date);

      // Verify record exists in database
      const { data: dbRecord } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id)
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

      expect(declineResponse?.status).toBe('declined');

      // Verify only one record exists with declined status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('declined');
    });

    it('allows decline after previous interest (upsert behavior)', async () => {
      // First show interest
      await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );

      // Then decline (should upsert)
      const declineResponse = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );

      expect(declineResponse?.status).toBe('declined');

      // Verify only one record exists with declined status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('declined');
    });

    it('fails with invalid resource id', async () => {
      await expect(
        resourcesApi.declineResource(supabase, 'invalid-resource-id'),
      ).rejects.toThrow();
    });
  });

  describe('basic workflow verification', () => {
    it('verifies accept, decline, and re-accept workflow', async () => {
      // Accept resource
      const acceptResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'accepted',
      );
      expect(acceptResponse?.status).toBe('accepted');

      // Decline resource
      const declineResponse = await resourcesApi.declineResource(
        supabase,
        testResource.id,
      );
      expect(declineResponse?.status).toBe('declined');

      // Accept again with different status
      const reacceptResponse = await resourcesApi.acceptResource(
        supabase,
        testResource.id,
        'interested',
      );
      expect(reacceptResponse?.status).toBe('interested');

      // Verify only one record exists with final status
      const { data: dbRecords } = await supabase
        .from('resource_responses')
        .select('*')
        .eq('resource_id', testResource.id)
        .eq('user_id', communityMember.id);

      expect(dbRecords).toHaveLength(1);
      expect(dbRecords![0].status).toBe('interested');
    });
  });

  describe('fetchResourceResponses', () => {
    beforeEach(async () => {
      // Create a test response for fetch tests
      await resourcesApi.acceptResource(supabase, testResource.id, 'accepted');
    });

    it('fetches responses by resource id', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        resourceId: testResource.id,
      });

      expect(responses).toHaveLength(1);
      expect(responses[0].resourceId).toBe(testResource.id);
      expect(responses[0].userId).toBe(communityMember.id);
      expect(responses[0].status).toBe('accepted');
    });

    it('fetches responses by user id', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        userId: communityMember.id,
      });

      expect(responses.length).toBeGreaterThanOrEqual(1);
      expect(responses.every((r) => r.userId === communityMember.id)).toBe(
        true,
      );
    });

    it('returns empty array for non-existent resource', async () => {
      const responses = await resourcesApi.fetchResourceResponses(supabase, {
        resourceId: '00000000-0000-0000-0000-000000000000',
      });

      expect(responses).toHaveLength(0);
    });
  });
});
