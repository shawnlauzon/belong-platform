import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData, cleanupResourceClaim } from '../helpers/cleanup';
import {
  createTestUser,
  createTestCommunity,
  createTestResource,
  createTestResourceTimeslot,
} from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import {
  createResourceClaim,
  updateResourceClaim,
} from '@/features/resources/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  getCurrentTrustScore,
  verifyTrustScoreLog,
  getCachedActionPoints,
} from './helpers';
import { ACTION_TYPES } from '@/features/notifications';
import type { User } from '@/features/users/types';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import type {
  Resource,
  ResourceTimeslot,
  ResourceClaim,
} from '@/features/resources/types';

describe('Trust Score Points - Requests', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let owner: Account;
  let claimant: Account;
  let community: Community;
  let request: Resource;
  let timeslot: ResourceTimeslot;
  let testClaim: ResourceClaim;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

    // Create owner (automatically signed in)
    owner = await createTestUser(supabase);

    // Create community (owner automatically becomes member)
    community = await createTestCommunity(supabase);

    // Create request and timeslot while owner is signed in
    request = await createTestResource(supabase, community.id, 'request');
    timeslot = await createTestResourceTimeslot(supabase, request.id);

    // Create claimant (automatically signed in as claimant now)
    claimant = await createTestUser(supabase);

    // Claimant joins community
    await joinCommunity(supabase, claimant.id, community.id);
  });

  beforeEach(async () => {
    await signIn(supabase, claimant.email, 'TestPass123!');
    // At end of beforeEach: claimant is signed in
  });

  afterEach(async () => {
    if (testClaim) {
      await cleanupResourceClaim(testClaim.id);
    }
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should not award points for creating request', async () => {
    // Switch to owner context
    await signIn(supabase, owner.email, 'TestPass123!');

    const scoreAfterCommunity = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );

    await createTestResource(supabase, community.id, 'request');

    const scoreAfterRequest = await getCurrentTrustScore(
      supabase,
      owner.id,
      community.id,
    );
    expect(scoreAfterRequest - scoreAfterCommunity).toBe(0);
  });

  it('should award points for claiming request', async () => {
    // Claimant is already signed in from beforeEach

    const scoreBeforeClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    testClaim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    const scoreAfterClaim = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    const expectedPoints = await getCachedActionPoints('claim.request.created');
    expect(scoreAfterClaim - scoreBeforeClaim).toBe(expectedPoints);
  });

  it('should not award points for given status', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    const scoreBeforeGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    const scoreAfterGiven = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    expect(scoreAfterGiven - scoreBeforeGiven).toBe(0);
  });

  it('should award points for completed status', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    // For requests: claimant marks as given (they give to fulfill the request)
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    const scoreBeforeCompleted = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );

    // For requests: owner marks as completed (they confirm receipt)
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'completed',
    });

    const scoreAfterCompleted = await getCurrentTrustScore(
      supabase,
      claimant.id,
      community.id,
    );
    const expectedPoints = await getCachedActionPoints(
      'claim.request.completed',
    );
    expect(scoreAfterCompleted - scoreBeforeCompleted).toBe(expectedPoints);
  });

  it('should log completed action', async () => {
    // Use shared data from beforeEach
    testClaim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    // For requests: claimant marks as given (they give to fulfill the request)
    await updateResourceClaim(supabase, { id: testClaim.id, status: 'given' });

    // For requests: owner marks as completed (they confirm receipt)
    await signIn(supabase, owner.email, 'TestPass123!');
    await updateResourceClaim(supabase, {
      id: testClaim.id,
      status: 'completed',
    });

    const expectedPoints = await getCachedActionPoints(
      'claim.request.completed',
    );
    await verifyTrustScoreLog(
      serviceClient,
      claimant.id,
      community.id,
      'claim.request.completed',
      expectedPoints,
      'Request completion log',
    );
  });
});
