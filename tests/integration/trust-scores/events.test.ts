import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData, cleanupResourceClaim } from '../helpers/cleanup';
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
import {
  Account,
  Community,
  Resource,
  ResourceTimeslot,
  ResourceClaim,
} from '@/features';

describe('Trust Score Points - Events', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let organizer: Account;
  let participant: Account;
  let community: Community;
  let event: Resource;
  let timeslot: ResourceTimeslot;
  let testClaim: ResourceClaim | null = null;

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

  afterEach(async () => {
    if (testClaim) {
      await cleanupResourceClaim(testClaim.id);
      testClaim = null;
    }
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should register for event without approval', async () => {
    const testTimeslot = await createTestResourceTimeslot(supabase, event.id);

    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: testTimeslot.id,
    });

    expect(testClaim.id).toBeDefined();
    expect(testClaim.status).toBe('approved');
    expect(testClaim.commitmentLevel).toBe('interested');
  });

  it('should award points for event registration', async () => {
    const testTimeslot = await createTestResourceTimeslot(supabase, event.id);

    const scoreBeforeRegistration = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: testTimeslot.id,
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
    const testTimeslot = await createTestResourceTimeslot(supabase, event.id);

    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: testTimeslot.id,
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

  it('should allow participant to confirm going', async () => {
    const testTimeslot = await createTestResourceTimeslot(supabase, event.id);

    // Participant is signed in from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: testTimeslot.id,
    });

    const updatedClaim = await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'going',
    });

    expect(updatedClaim.status).toBe('going');
  });

  it('should award points for going status', async () => {
    const testTimeslot = await createTestResourceTimeslot(supabase, event.id);

    // Participant is signed in from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: testTimeslot.id,
    });

    const scoreBeforeGoing = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    const scoreAfterGoing = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );
    expect(scoreAfterGoing - scoreBeforeGoing).toBe(POINTS_CONFIG.EVENT_GOING);
  });

  it('should allow organizer to mark attendance', async () => {
    // Participant is signed in from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    // Switch to organizer context
    await signIn(supabase, organizer.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'attended',
    });

    expect(updatedClaim.status).toBe('attended');
    // afterEach will sign back in as participant
  });

  it('should award points for attended status', async () => {
    // Participant is signed in from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    const scoreBeforeAttended = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    // Switch to organizer to mark attended
    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'attended',
    });

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
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'attended',
    });

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
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'flaked',
    });

    expect(updatedClaim.status).toBe('flaked');
  });

  it('should not award points for flaked status', async () => {
    // Participant is signed in from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    const scoreBeforeFlaked = await getCurrentTrustScore(
      supabase,
      participant.id,
      community.id,
    );

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'flaked' });

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
    let approvalClaim: ResourceClaim | null = null;

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

    afterEach(async () => {
      if (approvalClaim) {
        await cleanupResourceClaim(approvalClaim.id);
        approvalClaim = null;
      }
    });

    it('should register for event requiring approval', async () => {
      approvalClaim = await createResourceClaim(supabase, {
        resourceId: approvalEvent.id,
        timeslotId: approvalTimeslot.id,
      });

      expect(approvalClaim.status).toBe('pending');
    });

    it('should not award points for pending registration', async () => {
      const scoreBeforeRegistration = await getCurrentTrustScore(
        supabase,
        participant.id,
        community.id,
      );

      approvalClaim = await createResourceClaim(supabase, {
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

    it('should award points for approved registration', async () => {
      approvalClaim = await createResourceClaim(supabase, {
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
        id: approvalClaim.id,
        status: 'approved',
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
    testClaim = await createResourceClaim(supabase, {
      resourceId: event.id,
      timeslotId: timeslot.id,
    });

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'going' });

    await signIn(supabase, organizer.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'attended',
    });

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
