import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { joinCommunity } from '@/features/communities/api';
import { signIn } from '@/features/auth/api';
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  POINTS_CONFIG,
  getCurrentTrustScore,
  verifyTrustScoreLog,
} from './helpers';
import { Community, Resource, ResourceTimeslot, User } from '@/features';

describe('Trust Score Points - Events', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let organizer: User;
  let participant: User;
  let community: Community;
  let event: Resource;
  let timeslot: ResourceTimeslot;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

    // Create organizer (automatically signed in)
    organizer = await createTestUser(supabase);

    // Create community (organizer automatically becomes member)
    community = await createTestCommunity(supabase);

    // Create event and timeslot while organizer is signed in
    event = await createTestResource(supabase, community.id, 'event', 'other');
    timeslot = await createTestResourceTimeslot(supabase, event.id);

    // Create participant (automatically signed in as participant now)
    participant = await createTestUser(supabase);

    // Participant joins community
    await joinCommunity(supabase, community.id);
  });

  beforeEach(async () => {
    await signIn(supabase, participant.email, 'TestPass123!');
    // At end of beforeEach: participant is signed in
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should register for event without approval', async () => {
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    expect(claim.id).toBeDefined();
    expect(claim.status).toBe('interested');
  });

  it('should award 5 points for event registration', async () => {
    const scoreBeforeRegistration = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    const scoreAfterRegistration = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    expect(scoreAfterRegistration - scoreBeforeRegistration).toBe(
      POINTS_CONFIG.EVENT_CLAIM_INITIAL,
    );
  });

  it('should log event registration action', async () => {
    await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await verifyTrustScoreLog(
      serviceClient,
      participant.id,
      community.id,
      'resource_claim',
      POINTS_CONFIG.EVENT_CLAIM_INITIAL,
      'Event registration log',
    );
  });

  it.only('should allow participant to confirm going', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'going',
    });

    expect(updatedClaim.status).toBe('going');
  });

  it('should award 25 points for going status', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    const scoreBeforeGoing = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    const scoreAfterGoing = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    expect(scoreAfterGoing - scoreBeforeGoing).toBe(POINTS_CONFIG.EVENT_GOING);
  });

  it('should allow organizer to mark attendance', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    // Switch to organizer context
    await signIn(supabase, organizer.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'attended',
    });

    expect(updatedClaim.status).toBe('attended');
    // afterEach will sign back in as participant
  });

  it('should award 50 points for attended status', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    const scoreBeforeAttended = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    // Switch to organizer to mark attended
    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'attended' });

    // Switch back to participant to check score
    await signIn(supabase, participant.email, 'TestPass123!');
    const scoreAfterAttended = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    expect(scoreAfterAttended - scoreBeforeAttended).toBe(
      POINTS_CONFIG.EVENT_ATTENDED,
    );
    // afterEach will ensure participant is signed in for next test
  });

  it('should log attended action', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'attended' });

    await verifyTrustScoreLog(
      serviceClient,
      participant.id,
      community.id,
      'resource_completion',
      POINTS_CONFIG.EVENT_ATTENDED,
      'Event attendance log',
    );
  });

  it('should allow organizer to mark flaked', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'flaked',
    });

    expect(updatedClaim.status).toBe('flaked');
  });

  it('should not award points for flaked status', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    const scoreBeforeFlaked = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'flaked' });

    // Switch back to participant to check score
    await signIn(supabase, participant.email, 'TestPass123!');
    const scoreAfterFlaked = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    expect(scoreAfterFlaked - scoreBeforeFlaked).toBe(0);
  });

  describe('Events Requiring Approval', () => {
    let approvalEvent: Resource;
    let approvalTimeslot: ResourceTimeslot;

    beforeEach(async () => {
      // Switch to the SAME organizer who created the community to create approval-required event
      await signIn(supabase, organizer.email, 'TestPass123!');
      approvalEvent = await createTestResource(
        supabase,
        community.id,
        'event',
        'other',
        true,
      ); // requires approval
      approvalTimeslot = await createTestResourceTimeslot(
        supabase,
        approvalEvent.id,
      );

      // Switch back to participant
      await signIn(supabase, participant.email, 'TestPass123!');
    });

    it('should register for event requiring approval', async () => {
      const claim = await createResourceClaim(supabase, {
        resourceId: approvalEvent.id,
        timeslotId: approvalTimeslot.id,
      });

      expect(claim.status).toBe('pending');
    });

    it('should not award points for pending registration', async () => {
      const scoreBeforeRegistration = await getCurrentTrustScore(
        supabase,
        participant.id,
        community.id,
      );

      await createResourceClaim(supabase, {
        resourceId: approvalEvent.id,
        timeslotId: approvalTimeslot.id,
      });

      const scoreAfterRegistration = await getCurrentTrustScore(
        supabase,
        participant.id,
        community.id,
      );
      expect(scoreAfterRegistration - scoreBeforeRegistration).toBe(0);
    });

    it('should allow organizer to approve registration', async () => {
      const claim = await createResourceClaim(supabase, {
        resourceId: approvalEvent.id,
        timeslotId: approvalTimeslot.id,
      });

      // Wait for claim creation to complete

      // Verify initial status is pending
      expect(claim.status).toBe('pending');

      // Switch to organizer to approve
      await signIn(supabase, organizer.email, 'TestPass123!');
      const updatedClaim = await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'interested',
      });

      expect(updatedClaim.status).toBe('interested');
    });

    it('should award 25 points for approved registration', async () => {
      const claim = await createResourceClaim(supabase, {
        resourceId: approvalEvent.id,
        timeslotId: approvalTimeslot.id,
      });

      const scoreBeforeApproval = await getCurrentTrustScore(
        supabase,
        participant.id,
        community.id,
      );

      // Switch to organizer to approve
      await signIn(supabase, organizer.email, 'TestPass123!');
      await updateResourceClaim(supabase, {
        id: claim.id,
        status: 'interested',
      });

      // Switch back to participant to check score
      await signIn(supabase, participant.email, 'TestPass123!');
      const scoreAfterApproval = await getCurrentTrustScore(
        supabase,
        participant.id,
        community.id,
      );
      expect(scoreAfterApproval - scoreBeforeApproval).toBe(
        POINTS_CONFIG.EVENT_CLAIM_APPROVED,
      );
    });
  });

  it('should accumulate points through full event flow', async () => {
    // Participant is signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: claim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: claim.id, status: 'attended' });

    // Switch back to participant to check score
    await signIn(supabase, participant.email, 'TestPass123!');
    const finalScore = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    const expectedTotal =
      POINTS_CONFIG.COMMUNITY_JOIN +
      POINTS_CONFIG.EVENT_CLAIM_INITIAL +
      POINTS_CONFIG.EVENT_GOING +
      POINTS_CONFIG.EVENT_ATTENDED;
    expect(finalScore).toBe(expectedTotal);
  });
});
