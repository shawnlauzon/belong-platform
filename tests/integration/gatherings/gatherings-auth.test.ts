import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestGathering,
  createTestCommunity,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/gatherings/api';
import { signIn, signOut } from '@/features/auth/api';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '@/features/gatherings/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';

describe('Gatherings API - Authentication Requirements', () => {
  let authenticatedClient: SupabaseClient<Database>;
  let unauthenticatedClient: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let testGathering: Gathering;

  beforeAll(async () => {
    // Set up authenticated client and test data
    authenticatedClient = createTestClient();

    // Create test data with authenticated client
    testUser = await createTestUser(authenticatedClient);
    await signIn(authenticatedClient, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(authenticatedClient);
    testGathering = await createTestGathering({
      supabase: authenticatedClient,
      organizerId: testUser.id,
      communityId: testCommunity.id,
    });

    // Set up unauthenticated client
    unauthenticatedClient = createTestClient();
    await signOut(unauthenticatedClient);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('Unauthenticated Read Operations', () => {
    describe('fetchGatherings', () => {
      it('allows unauthenticated access', async () => {
        const gatherings = await api.fetchGatherings(unauthenticatedClient);

        expect(Array.isArray(gatherings)).toBe(true);
        expect(gatherings.some((e) => e.id === testGathering.id)).toBe(true);
      });

      it('allows unauthenticated access with filters', async () => {
        const gatherings = await api.fetchGatherings(unauthenticatedClient, {
          title: 'test',
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });

        expect(Array.isArray(gatherings)).toBe(true);
      });

      it('allows unauthenticated access with date filters', async () => {
        const gatherings = await api.fetchGatherings(unauthenticatedClient, {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
          endDate: new Date(Date.now() + 48 * 60 * 60 * 1000), // Day after tomorrow
        });

        expect(Array.isArray(gatherings)).toBe(true);
      });
    });

    describe('fetchGatheringInfoById', () => {
      it('allows unauthenticated access to existing gathering', async () => {
        const result = await api.fetchGatheringInfoById(
          unauthenticatedClient,
          testGathering.id,
        );

        expect(result).toBeTruthy();
        expect(result!.id).toBe(testGathering.id);
        expect(result!.title).toBe(testGathering.title);
      });

      it('returns null for non-existent gathering without authentication', async () => {
        const result = await api.fetchGatheringInfoById(
          unauthenticatedClient,
          '00000000-0000-0000-0000-000000000000',
        );

        expect(result).toBeNull();
      });
    });

    describe('fetchGatheringResponses', () => {
      it('allows unauthenticated access to gathering attendees', async () => {
        const attendees = await api.fetchGatheringResponses(
          unauthenticatedClient,
          testGathering.id,
        );

        expect(Array.isArray(attendees)).toBe(true);
        expect(attendees.some((a) => a.userId === testUser.id)).toBe(true);
      });
    });
  });

  describe('Unauthenticated Write Operations', () => {
    describe('createGathering', () => {
      it('requires authentication', async () => {
        const data = createFakeGatheringInput({
          title: `${TEST_PREFIX}Unauth_Create_Test`,
          organizerId: testUser.id,
          communityId: testCommunity.id,
          startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          imageUrls: undefined,
        });

        await expect(
          api.createGathering(unauthenticatedClient, data),
        ).rejects.toThrow();
      });
    });

    describe('updateGathering', () => {
      it('requires authentication', async () => {
        await expect(
          api.updateGathering(unauthenticatedClient, {
            id: testGathering.id,
            title: 'Unauthorized Update Attempt',
          }),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent gathering', async () => {
        await expect(
          api.updateGathering(unauthenticatedClient, {
            id: '00000000-0000-0000-0000-000000000000',
            title: 'Test',
          }),
        ).rejects.toThrow();
      });
    });

    describe('deleteGathering', () => {
      it('requires authentication', async () => {
        await expect(
          api.deleteGathering(unauthenticatedClient, testGathering.id),
        ).rejects.toThrow();
      });

      it('requires authentication even for non-existent gathering', async () => {
        await expect(
          api.deleteGathering(
            unauthenticatedClient,
            '00000000-0000-0000-0000-000000000000',
          ),
        ).rejects.toThrow();
      });
    });

    describe('joinGathering', () => {
      it('requires authentication', async () => {
        await expect(
          api.joinGathering(unauthenticatedClient, testGathering.id),
        ).rejects.toThrow();
      });
    });

    describe('leaveGathering', () => {
      it('requires authentication', async () => {
        await expect(
          api.leaveGathering(unauthenticatedClient, testGathering.id),
        ).rejects.toThrow();
      });
    });
  });

  describe('Security Boundary Verification', () => {
    it('authenticated client can create gatherings', async () => {
      const data = createFakeGatheringInput({
        title: `${TEST_PREFIX}Auth_Create_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      const gathering = await api.createGathering(authenticatedClient, data);
      expect(gathering).toBeTruthy();
      expect(gathering!.title).toBe(data.title);
    });

    it('authenticated client can update own gatherings', async () => {
      const newTitle = `${TEST_PREFIX}Auth_Update_Test_${Date.now()}`;

      const updated = await api.updateGathering(authenticatedClient, {
        id: testGathering.id,
        title: newTitle,
      });

      expect(updated).toBeTruthy();
      expect(updated!.title).toBe(newTitle);
    });

    it('authenticated client can join and leave gatherings', async () => {
      // Create a second user and gathering
      const secondUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, secondUser.email, 'TestPass123!');

      // Join the existing test gathering
      const attendance = await api.joinGathering(authenticatedClient, testGathering.id);

      expect(attendance).toBeTruthy();
      expect(attendance!.gatheringId).toBe(testGathering.id);
      expect(attendance!.userId).toBe(secondUser.id);

      // Leave the gathering
      const leaveResult = await api.leaveGathering(
        authenticatedClient,
        testGathering.id,
      );

      // Verify leave operation returned attendance info with not_attending status
      expect(leaveResult).toBeDefined();
      expect(leaveResult!.status).toBe('not_attending');
      expect(leaveResult!.gatheringId).toBe(testGathering.id);
      expect(leaveResult!.userId).toBe(secondUser.id);

      // Verify attendance record still exists but with not_attending status
      const attendees = await api.fetchGatheringResponses(
        authenticatedClient,
        testGathering.id,
      );
      const userAttendance = attendees.find((a) => a.userId === secondUser.id);
      expect(userAttendance).toBeDefined();
      expect(userAttendance!.status).toBe('not_attending');
    });

    it('authenticated client can delete own gatherings', async () => {
      // Create a new gathering to delete
      const deleteData = createFakeGatheringInput({
        title: `${TEST_PREFIX}Auth_Delete_Test_${Date.now()}`,
        organizerId: testUser.id,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      // Sign back in as original user
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
      const gatheringToDelete = await api.createGathering(
        authenticatedClient,
        deleteData,
      );

      // Delete the gathering
      await api.deleteGathering(authenticatedClient, gatheringToDelete!.id);

      // Verify gathering is deleted
      const result = await api.fetchGatheringInfoById(
        authenticatedClient,
        gatheringToDelete!.id,
      );
      expect(result).toBeNull();
    });

    it('unauthenticated fetch still works after authenticated operations', async () => {
      // Verify that unauthenticated read access still works after auth operations
      const gatherings = await api.fetchGatherings(unauthenticatedClient);
      expect(Array.isArray(gatherings)).toBe(true);

      const gathering = await api.fetchGatheringInfoById(
        unauthenticatedClient,
        testGathering.id,
      );
      expect(gathering).toBeTruthy();
    });

    it('handles datetime fields in unauthenticated access', async () => {
      const gathering = await api.fetchGatheringInfoById(
        unauthenticatedClient,
        testGathering.id,
      );

      expect(gathering).toBeTruthy();
      expect(gathering!.startDateTime).toBeInstanceOf(Date);
      expect(gathering!.createdAt).toBeInstanceOf(Date);
      expect(gathering!.updatedAt).toBeInstanceOf(Date);

      if (gathering!.endDateTime) {
        expect(gathering!.endDateTime).toBeInstanceOf(Date);
      }
    });

    it('handles coordinates in unauthenticated access', async () => {
      const gathering = await api.fetchGatheringInfoById(
        unauthenticatedClient,
        testGathering.id,
      );

      expect(gathering).toBeTruthy();
      if (gathering!.coordinates) {
        expect(gathering!.coordinates).toHaveProperty('lat');
        expect(gathering!.coordinates).toHaveProperty('lng');
        expect(typeof gathering!.coordinates.lat).toBe('number');
        expect(typeof gathering!.coordinates.lng).toBe('number');
      }
    });

    it('handles capacity and attendance count in unauthenticated access', async () => {
      const gathering = await api.fetchGatheringInfoById(
        unauthenticatedClient,
        testGathering.id,
      );

      expect(gathering).toBeTruthy();
      expect(typeof gathering!.attendeeCount).toBe('number');
      expect(gathering!.attendeeCount).toBeGreaterThanOrEqual(1); // At least organizer

      if (gathering!.maxAttendees !== null && gathering!.maxAttendees !== undefined) {
        expect(typeof gathering!.maxAttendees).toBe('number');
        expect(gathering!.maxAttendees).toBeGreaterThan(0);
      }
    });
  });

  describe('Authorization Edge Cases', () => {
    it('prevents users from updating gatherings they do not own', async () => {
      // Create a second user
      const otherUser = await createTestUser(authenticatedClient);
      await signIn(authenticatedClient, otherUser.email, 'TestPass123!');

      // Try to update the original test gathering (owned by testUser)
      await expect(
        api.updateGathering(authenticatedClient, {
          id: testGathering.id,
          title: 'Unauthorized Update by Other User',
        }),
      ).rejects.toThrow();
    });

    it('prevents users from deleting gatherings they do not own', async () => {
      // Still signed in as otherUser from previous test
      // Try to delete the original test gathering (owned by testUser)
      await expect(
        api.deleteGathering(authenticatedClient, testGathering.id),
      ).rejects.toThrow();

      // Sign back in as original user for cleanup
      await signIn(authenticatedClient, testUser.email, 'TestPass123!');
    });

    it('allows organizer full control over their gatherings', async () => {
      // Already signed in as testUser (original organizer)

      // Should be able to update
      const updateResult = await api.updateGathering(authenticatedClient, {
        id: testGathering.id,
        description: 'Updated by organizer',
      });
      expect(updateResult).toBeTruthy();
      expect(updateResult!.description).toBe('Updated by organizer');

      // Should be able to see full gathering details
      const fetchResult = await api.fetchGatheringInfoById(
        authenticatedClient,
        testGathering.id,
      );
      expect(fetchResult).toBeTruthy();
      expect(fetchResult!.description).toBe('Updated by organizer');
    });
  });
});
