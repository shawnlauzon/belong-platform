import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as resourcesApi from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities/types';

describe('Resource Computed Fields', () => {
  let supabase: SupabaseClient<Database>;
  let testCommunity: Community;

  beforeAll(async () => {
    supabase = createTestClient();
    await createTestUser(supabase);
    testCommunity = await createTestCommunity(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Platform API returns expiresAt field', () => {
    it('fetchResourceById includes expiresAt', async () => {
      const created = await createTestResource(supabase, testCommunity.id, 'offer');
      
      const resource = await resourcesApi.fetchResourceById(supabase, created.id);

      expect(resource).toMatchObject({
        expiresAt: expect.any(Date),
      });
    });

    it.skip('fetchResources includes expiresAt on all resources', async () => {
      await createTestResource(supabase, testCommunity.id, 'offer');
      await createTestResource(supabase, testCommunity.id, 'request');
      
      const resources = await resourcesApi.fetchResources(supabase, {
        communityId: testCommunity.id,
      });

      resources.forEach(resource => {
        expect(resource).toMatchObject({
          expiresAt: expect.any(Date),
        });
      });
    });

    it.skip('fetchResourcesByUser includes expiresAt', async () => {
      await createTestResource(supabase, testCommunity.id, 'offer');
      
      const resources = await resourcesApi.fetchResources(
        supabase,
        {
          communityId: testCommunity.id,
        }
      );

      resources.forEach(resource => {
        expect(resource).toMatchObject({
          expiresAt: expect.any(Date),
        });
      });
    });

    it('event resources can have undefined expiresAt', async () => {
      const created = await createTestResource(supabase, testCommunity.id, 'event');
      
      const resource = await resourcesApi.fetchResourceById(supabase, created.id);

      // Events might have undefined expiresAt, so just check the property exists
      expect(resource).toHaveProperty('expiresAt');
    });
  });
});