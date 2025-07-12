import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestGathering,
  createTestCommunity,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupGatheringResponse,
} from '../helpers/cleanup';
import * as api from '@/features/gatherings/api';
import { signIn } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '@/features/gatherings/types';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';

describe('Gatherings API - Response Operations', () => {
  let supabase: SupabaseClient<Database>;
  let organizer: User;
  let attendeeUser: User;
  let testCommunity: Community;
  let testGathering: Gathering;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create organizer and community
    organizer = await createTestUser(supabase);
    await signIn(supabase, organizer.email, 'TestPass123!');
    
    testCommunity = await createTestCommunity(supabase);
    testGathering = await createTestGathering({
      supabase,
      organizerId: organizer.id,
      communityId: testCommunity.id,
    });

    // Create attendee user (will sign in as needed per test)
    attendeeUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('joinGathering', () => {
    beforeAll(async () => {
      // Sign in as attendee for all join tests
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });

    it('adds user as attendee', async () => {
      const response = await api.joinGathering(supabase, testGathering.id);

      expect(response!.userId).toBe(attendeeUser.id);
      expect(response!.gatheringId).toBe(testGathering.id);
      expect(response!.status).toBe('attending');

      // Verify in database
      const { data } = await supabase
        .from('gathering_responses')
        .select()
        .eq('gathering_id', testGathering.id)
        .eq('user_id', attendeeUser.id)
        .maybeSingle();

      expect(data).toBeTruthy();
      expect(data!.status).toBe('attending');

      // Cleanup
      await cleanupGatheringResponse(testGathering.id, attendeeUser.id);
    });

    it('prevents duplicate response', async () => {
      // First join
      await api.joinGathering(supabase, testGathering.id);

      // Second join should fail
      await expect(
        api.joinGathering(supabase, testGathering.id),
      ).rejects.toThrow();

      // Cleanup
      await cleanupGatheringResponse(testGathering.id, attendeeUser.id);
    });

    it('fails with invalid gathering id', async () => {
      await expect(
        api.joinGathering(supabase, 'invalid-gathering-id'),
      ).rejects.toThrow();
    });

    it('organizer cannot join their own gathering', async () => {
      // Switch to organizer
      await signIn(supabase, organizer.email, 'TestPass123!');

      // Organizer attempting to join should fail (they're auto-attending)
      await expect(
        api.joinGathering(supabase, testGathering.id),
      ).rejects.toThrow();

      // Switch back to attendee
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });
  });

  describe('leaveGathering', () => {
    beforeAll(async () => {
      // Sign in as attendee for all leave tests
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });

    it('updates response status to not_attending', async () => {
      // First join
      await api.joinGathering(supabase, testGathering.id);

      // Then leave
      const result = await api.leaveGathering(supabase, testGathering.id);

      // Verify the function returns response info with not_attending status
      expect(result).toBeDefined();
      expect(result!.status).toBe('not_attending');
      expect(result!.gatheringId).toBe(testGathering.id);
      expect(result!.userId).toBe(attendeeUser.id);

      // Verify database record is updated, not deleted
      const { data } = await supabase
        .from('gathering_responses')
        .select()
        .eq('gathering_id', testGathering.id)
        .eq('user_id', attendeeUser.id)
        .maybeSingle();

      expect(data).not.toBeNull();
      expect(data!.status).toBe('not_attending');

      // Cleanup
      await cleanupGatheringResponse(testGathering.id, attendeeUser.id);
    });

    it('handles leaving when not attending', async () => {
      // Should not throw error when leaving a gathering you're not attending
      await expect(
        api.leaveGathering(supabase, testGathering.id),
      ).resolves.not.toThrow();
    });

    it('organizer can leave their own gathering', async () => {
      // Switch to organizer
      await signIn(supabase, organizer.email, 'TestPass123!');

      // Organizer should be able to leave their own gathering
      const result = await api.leaveGathering(supabase, testGathering.id);

      // Verify the function returns response info with not_attending status
      expect(result).toBeDefined();
      expect(result!.status).toBe('not_attending');

      const { data } = await supabase
        .from('gathering_responses')
        .select()
        .eq('gathering_id', testGathering.id)
        .eq('user_id', organizer.id)
        .maybeSingle();

      expect(data).not.toBeNull();
      expect(data!.status).toBe('not_attending');

      // Restore organizer to attending status for subsequent tests
      // (Since organizers should naturally be attending their gatherings)
      await api.joinGathering(supabase, testGathering.id);

      // Switch back to attendee
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });
  });

  describe('fetchGatheringResponses', () => {
    beforeAll(async () => {
      // Sign in as attendee and join for all fetch tests
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
      await api.joinGathering(supabase, testGathering.id);
    });

    afterAll(async () => {
      await cleanupGatheringResponse(testGathering.id, attendeeUser.id);
    });

    it('returns attendees with user data', async () => {
      const attendees = await api.fetchGatheringResponses(
        supabase,
        testGathering.id,
      );

      expect(attendees).toContainEqual({
        userId: attendeeUser.id,
        gatheringId: testGathering.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('includes organizer as an attendee', async () => {
      const attendees = await api.fetchGatheringResponses(
        supabase,
        testGathering.id,
      );

      expect(attendees).toContainEqual({
        userId: organizer.id,
        gatheringId: testGathering.id,
        status: 'attending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('basic functionality verification', () => {
    beforeAll(async () => {
      // Sign in as attendee for verification tests
      await signIn(supabase, attendeeUser.email, 'TestPass123!');
    });

    it('verifies basic join and leave workflow', async () => {
      // Join the gathering
      const joinResponse = await api.joinGathering(supabase, testGathering.id);
      expect(joinResponse!.status).toBe('attending');

      // Verify we're listed as attendee
      const attendees = await api.fetchGatheringResponses(supabase, testGathering.id);
      expect(attendees.some(a => a.userId === attendeeUser.id && a.status === 'attending')).toBe(true);

      // Leave the gathering
      const leaveResponse = await api.leaveGathering(supabase, testGathering.id);
      expect(leaveResponse!.status).toBe('not_attending');

      // Verify status changed
      const attendeesAfterLeave = await api.fetchGatheringResponses(supabase, testGathering.id);
      expect(attendeesAfterLeave.some(a => a.userId === attendeeUser.id && a.status === 'not_attending')).toBe(true);

      // Cleanup
      await cleanupGatheringResponse(testGathering.id, attendeeUser.id);
    });
  });
});
