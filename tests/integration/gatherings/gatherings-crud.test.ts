import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestGathering,
  TEST_PREFIX,
} from '../helpers/test-data';
import { cleanupAllTestData, cleanupGathering } from '../helpers/cleanup';
import * as api from '@/features/gatherings/api';
import { signIn } from '@/features/auth/api';
import { createFakeGatheringInput } from '@/features/gatherings/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import type { Gathering } from '@/features/gatherings/types';
import { parsePostGisPoint } from '@/shared';

describe('Gatherings API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let testCommunity: Community;
  let readOnlyGathering1: Gathering;
  let readOnlyGathering2: Gathering;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context for gathering creation
    await signIn(supabase, testUser.email, 'TestPass123!');

    testCommunity = await createTestCommunity(supabase);
    readOnlyGathering1 = await createTestGathering({
      supabase,
      organizerId: testUser.id,
      communityId: testCommunity.id,
    });
    readOnlyGathering2 = await createTestGathering({
      supabase,
      organizerId: testUser.id,
      communityId: testCommunity.id,
    });
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('createGathering', () => {
    it('creates gathering with valid data', async () => {
      const data = createFakeGatheringInput({
        title: `${TEST_PREFIX}Create_Test_${Date.now()}`,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        endDateTime: new Date(Date.now() + 25 * 60 * 60 * 1000), // Tomorrow + 1 hour
        imageUrls: undefined, // Don't generate random images
      });

      let gathering;
      try {
        gathering = await api.createGathering(supabase, data);

        expect(gathering).toBeTruthy();
        expect(gathering!.id).toBeTruthy();
        expect(gathering!.title).toBe(data.title);
        expect(gathering!.organizerId).toBe(testUser.id);
        expect(gathering!.communityId).toBe(testCommunity.id);

        // Verify database record exists with all expected fields
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering!.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: gathering!.id,
          title: data.title,
          description: data.description,
          organizer_id: testUser.id,
          community_id: testCommunity.id,
          is_all_day: data.isAllDay,
          location_name: data.locationName,
          max_attendees: data.maxAttendees ?? null,
          attendee_count: 1, // Organizer is auto-attendee
        });

        // Check datetime fields separately to handle timezone format differences
        expect(new Date(dbRecord!.start_date_time)).toEqual(data.startDateTime);
        if (data.endDateTime) {
          expect(new Date(dbRecord!.end_date_time!)).toEqual(data.endDateTime);
        }
        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          data.coordinates,
        );
        expect(dbRecord!.created_at).toBeTruthy();
        expect(dbRecord!.updated_at).toBeTruthy();
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('auto-creates organizer response', async () => {
      const data = createFakeGatheringInput({
        title: `${TEST_PREFIX}Attendance_Test_${Date.now()}`,
        communityId: testCommunity.id,
        startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        imageUrls: undefined,
      });

      let gathering;
      try {
        gathering = await api.createGathering(supabase, data);

        const { data: response } = await supabase
          .from('gathering_responses')
          .select()
          .eq('gathering_id', gathering!.id)
          .eq('user_id', testUser.id)
          .single();

        expect(response).toBeTruthy();
        expect(response!.status).toBe('attending');
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('handles image auto-commit workflow', async () => {
      const { uploadImage } = await import('@/features/images/api');

      // Create a test image file
      const testImageContent = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10,
      ]); // PNG header
      const testFile = new File([testImageContent], 'test-image.png', {
        type: 'image/png',
      });

      let tempImageResult: string | null = null;
      let gathering;

      try {
        // First upload a temporary image
        tempImageResult = await uploadImage({
          supabase,
          file: testFile,
          folder: 'temp-upload',
        });

        expect(tempImageResult).toBeTruthy();
        expect(typeof tempImageResult).toBe('string');
        expect(tempImageResult).toContain('temp-upload-');

        // Create gathering with the temporary image URL
        const data = createFakeGatheringInput({
          title: `${TEST_PREFIX}Image_Test_${Date.now()}`,
          communityId: testCommunity.id,
          startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
          imageUrls: [tempImageResult],
        });

        gathering = await api.createGathering(supabase, data);

        // If images are auto-committed, temp URLs should be converted to permanent URLs
        if (gathering!.imageUrls && gathering!.imageUrls.length > 0) {
          expect(gathering!.imageUrls[0]).not.toContain('temp-upload-');
          expect(gathering!.imageUrls[0]).toContain(
            `gathering-${gathering!.id}`,
          );

          // Verify the permanent image actually exists by checking storage
          const permanentUrl = gathering!.imageUrls[0];
          const pathMatch = permanentUrl.match(/\/images\/(.+)$/);
          if (pathMatch) {
            const imagePath = pathMatch[1];
            const { data: fileData } = await supabase.storage
              .from('images')
              .download(imagePath);
            expect(fileData).toBeTruthy();
          }
        }
      } finally {
        // Cleanup: Delete temporary file if it still exists
        if (tempImageResult) {
          // Extract the path from the URL for storage deletion
          const urlMatch = tempImageResult.match(/\/images\/(.+)$/);
          if (urlMatch) {
            const imagePath = urlMatch[1];
            await supabase.storage.from('images').remove([imagePath]);
          }
        }

        // Cleanup gathering (which should also cleanup permanent images)
        await cleanupGathering(gathering);
      }
    });
  });

  describe('fetchGatherings', () => {
    it('fetches all gatherings', async () => {
      const gatherings = await api.fetchGatherings(supabase);

      expect(Array.isArray(gatherings)).toBe(true);
      expect(gatherings.some((e) => e.id === readOnlyGathering1.id)).toBe(true);
      expect(gatherings.some((e) => e.id === readOnlyGathering2.id)).toBe(true);
    });

    it('filters by title', async () => {
      const uniqueTitle = `${TEST_PREFIX}UniqueFilter_${Date.now()}`;
      let filteredGathering;

      try {
        filteredGathering = await api.createGathering(
          supabase,
          createFakeGatheringInput({
            title: uniqueTitle,
            communityId: testCommunity.id,
            startDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
            imageUrls: undefined,
          }),
        );

        const filtered = await api.fetchGatherings(supabase, {
          searchTerm: 'UniqueFilter',
        });

        expect(filtered.some((e) => e.title === uniqueTitle)).toBe(true);
      } finally {
        await cleanupGathering(filteredGathering);
      }
    });

    it('filters by organizerId', async () => {
      const filtered = await api.fetchGatherings(supabase, {
        organizerId: testUser.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((e) => e.organizerId === testUser.id)).toBe(true);
    });

    it('filters by communityId', async () => {
      const filtered = await api.fetchGatherings(supabase, {
        communityId: testCommunity.id,
      });

      expect(filtered.length).toBeGreaterThanOrEqual(2);
      expect(filtered.every((e) => e.communityId === testCommunity.id)).toBe(
        true,
      );
    });

    it('filters by date range', async () => {
      const now = Date.now();
      const futureDate = new Date(now + 48 * 60 * 60 * 1000); // Day after tomorrow
      const filterStartDate = new Date(now + 36 * 60 * 60 * 1000); // 36 hours from now

      let futureGathering;

      try {
        futureGathering = await api.createGathering(
          supabase,
          createFakeGatheringInput({
            title: `${TEST_PREFIX}Future_Gathering_${Date.now()}`,
            communityId: testCommunity.id,
            startDateTime: futureDate,
            imageUrls: undefined,
          }),
        );

        const filtered = await api.fetchGatherings(supabase, {
          startAfter: filterStartDate,
        });

        // The future gathering should be included since it falls within the date range
        expect(filtered.some((e) => e.id === futureGathering!.id)).toBe(true);

        // All gatherings should have start times within or after the filter range
        const gatheringsOutsideRange = filtered.filter(
          (e) => e.startDateTime < filterStartDate,
        );
        expect(gatheringsOutsideRange).toEqual([]);
      } finally {
        await cleanupGathering(futureGathering);
      }
    });
  });

  describe('fetchGatheringInfoById', () => {
    it('returns gathering by id', async () => {
      const fetched = await api.fetchGatheringInfoById(
        supabase,
        readOnlyGathering1.id,
      );

      expect(fetched).toBeTruthy();
      expect(fetched!.id).toBe(readOnlyGathering1.id);
      expect(fetched!.title).toBe(readOnlyGathering1.title);
    });

    it('returns null for non-existent id', async () => {
      // Use a valid UUID format that doesn't exist
      const result = await api.fetchGatheringInfoById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateGathering', () => {
    it('updates gathering fields', async () => {
      // Create own gathering to modify
      let gathering;
      try {
        gathering = await createTestGathering({
          supabase,
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });

        const newTitle = `${TEST_PREFIX}Updated_${Date.now()}`;
        const newDescription = 'Updated description for test';
        const newLocation = 'Updated Location';

        const updated = await api.updateGathering(supabase, {
          id: gathering.id,
          title: newTitle,
          description: newDescription,
          locationName: newLocation,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(newDescription);
        expect(updated!.locationName).toBe(newLocation);
        expect(updated!.id).toBe(gathering.id);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: gathering.id,
          title: newTitle,
          description: newDescription,
          location_name: newLocation,
          organizer_id: gathering.organizerId,
          community_id: gathering.communityId,
        });
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('preserves unchanged fields', async () => {
      let gathering;
      try {
        gathering = await createTestGathering({
          supabase,
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });
        const newTitle = `${TEST_PREFIX}PartialUpdate_${Date.now()}`;
        const originalDescription = gathering.description;
        const originalLocation = gathering.locationName;

        const updated = await api.updateGathering(supabase, {
          id: gathering.id,
          title: newTitle,
        });

        expect(updated!.title).toBe(newTitle);
        expect(updated!.description).toBe(originalDescription);
        expect(updated!.locationName).toBe(originalLocation);
        expect(updated!.organizerId).toBe(gathering.organizerId);

        // Verify database record preserves unchanged fields
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: gathering.id,
          title: newTitle,
          description: originalDescription,
          location_name: originalLocation,
          organizer_id: gathering.organizerId,
          community_id: gathering.communityId,
        });
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('handles datetime updates', async () => {
      let gathering;
      try {
        gathering = await createTestGathering({
          supabase,
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });
        const newStartTime = new Date(Date.now() + 48 * 60 * 60 * 1000); // Day after tomorrow
        const newEndTime = new Date(Date.now() + 50 * 60 * 60 * 1000); // 2 hours later

        const updated = await api.updateGathering(supabase, {
          id: gathering.id,
          startDateTime: newStartTime,
          endDateTime: newEndTime,
          isAllDay: true,
        });

        expect(updated!.startDateTime).toEqual(newStartTime);
        expect(updated!.endDateTime).toEqual(newEndTime);
        expect(updated!.isAllDay).toBe(true);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering.id)
          .single();

        expect(new Date(dbRecord!.start_date_time)).toEqual(newStartTime);
        expect(new Date(dbRecord!.end_date_time!)).toEqual(newEndTime);
        expect(dbRecord!.is_all_day).toBe(true);
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('handles coordinates updates', async () => {
      let gathering;
      try {
        gathering = await createTestGathering({
          supabase,
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });
        const newCoordinates = { lat: 40.7128, lng: -74.006 }; // NYC

        const updated = await api.updateGathering(supabase, {
          id: gathering.id,
          coordinates: newCoordinates,
        });

        expect(updated!.coordinates).toEqual(newCoordinates);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering.id)
          .single();

        console.log('*** dbRecord.coordinates:', dbRecord!.coordinates);
        console.log(
          '*** parsePostGisPoint result:',
          parsePostGisPoint(dbRecord!.coordinates),
        );
        console.log('*** expected newCoordinates:', newCoordinates);

        expect(parsePostGisPoint(dbRecord!.coordinates)).toEqual(
          newCoordinates,
        );
      } finally {
        await cleanupGathering(gathering);
      }
    });

    it('handles maxAttendees updates', async () => {
      let gathering;
      try {
        gathering = await createTestGathering({
          supabase,
          organizerId: testUser.id,
          communityId: testCommunity.id,
        });
        const newMaxAttendees = 50;

        const updated = await api.updateGathering(supabase, {
          id: gathering.id,
          maxAttendees: newMaxAttendees,
        });

        expect(updated!.maxAttendees).toBe(newMaxAttendees);

        // Verify database record
        const { data: dbRecord } = await supabase
          .from('gatherings')
          .select('*')
          .eq('id', gathering.id)
          .single();

        expect(dbRecord!.max_attendees).toBe(newMaxAttendees);
      } finally {
        await cleanupGathering(gathering);
      }
    });
  });

  describe('deleteGathering', () => {
    it('deletes gathering and cascades to attendances', async () => {
      // Create an gathering specifically for deletion
      const gathering = await createTestGathering({
        supabase,
        organizerId: testUser.id,
        communityId: testCommunity.id,
      });
      const gatheringId = gathering.id;

      // Join another user to test cascade
      const user2 = await createTestUser(supabase);
      const user2Email = user2.email;

      // Sign in as user2 and join the gathering
      await signIn(supabase, user2Email, 'TestPass123!');
      await api.joinGathering(supabase, gatheringId);

      // Sign back in as the organizer to delete
      await signIn(supabase, testUser.email, 'TestPass123!');

      // Delete gathering
      await api.deleteGathering(supabase, gatheringId);

      // Wait a bit for the delete to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Verify gathering deleted
      const { data, error } = await supabase
        .from('gatherings')
        .select()
        .eq('id', gatheringId);

      expect(error).toBeNull();
      expect(data).toHaveLength(0);

      // Verify responses deleted
      const { data: responses } = await supabase
        .from('gathering_responses')
        .select()
        .eq('gathering_id', gatheringId);

      expect(responses).toHaveLength(0);

      // Note: gathering already deleted, user2 will be cleaned in afterAll
    });
  });
});
