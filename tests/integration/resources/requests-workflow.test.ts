import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
} from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
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

describe('Resource Requests - Workflow', () => {
  let supabase: SupabaseClient<Database>;
  let owner: any;
  let claimant: any;
  let community: any;
  let request: any;
  let timeslot: any;

  beforeAll(async () => {
    supabase = createTestClient();

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
    await joinCommunity(supabase, community.id);
  });

  beforeEach(async () => {
    await signIn(supabase, claimant.email, 'TestPass123!');
    // At end of beforeEach: claimant is signed in
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should create resource request', async () => {
    expect(request.id).toBeDefined();
    expect(request.type).toBe('request');
  });

  it('should allow claiming request without approval', async () => {
    // Claimant is already signed in from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    expect(claim.id).toBeDefined();
  });

  it('should allow claimant to mark as given', async () => {
    // Use shared data from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'given',
    });

    expect(updatedClaim.status).toBe('given');
  });

  it('should allow owner to mark as completed', async () => {
    // Use shared data from beforeEach
    const claim = await createResourceClaim(supabase, {
      resourceId: request.id,
      timeslotId: timeslot.id,
    });

    // For requests: claimant marks as given (they give to fulfill the request)
    await updateResourceClaim(supabase, { id: claim.id, status: 'given' });

    // For requests: owner marks as completed (they confirm receipt)
    await signIn(supabase, owner.email, 'TestPass123!');
    const updatedClaim = await updateResourceClaim(supabase, {
      id: claim.id,
      status: 'completed',
    });

    expect(updatedClaim.status).toBe('completed');
  });
});