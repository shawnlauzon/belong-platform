import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { cleanupAllTestData } from '../helpers/cleanup';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { signIn } from '@/features/auth/api';
import { updateUser } from '@/features/users/api';
import { joinCommunity } from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import {
  getCurrentTrustScore,
  verifyTrustScoreLog,
  getCachedActionPoints,
  verifyTrustScoreIncrement,
} from './helpers';
import { ACTION_TYPES } from '@/features/notifications';
import type { Account } from '@/features/auth/types';
import { faker } from '@faker-js/faker';

describe('Trust Score Points - Profile Updates', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let testUser: Account;

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();
  });

  beforeEach(async () => {
    // Create fresh user for each test to ensure independence
    testUser = await createTestUser(supabase);
    await signIn(supabase, testUser.email, 'TestPass123!');
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('should award points when user sets profile picture for first time', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Get initial score
    const initialScore = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Set avatar for the first time
    const avatarUrl = faker.image.avatar();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify score increased by expected amount
    const expectedPoints = await getCachedActionPoints('profile.picture.set');
    await verifyTrustScoreIncrement(
      supabase,
      testUser.id,
      community.id,
      initialScore,
      expectedPoints,
      'Profile picture set',
    );

    // Verify log entry
    await verifyTrustScoreLog(
      serviceClient,
      testUser.id,
      community.id,
      ACTION_TYPES.PROFILE_PICTURE_SET,
      expectedPoints,
      'Profile picture set log',
    );
  });

  it('should not award points when user updates profile picture again', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Set avatar for the first time
    const firstAvatarUrl = faker.image.avatar();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl: firstAvatarUrl,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get score after first update
    const scoreAfterFirstUpdate = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Update avatar again
    const secondAvatarUrl = faker.image.avatar();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl: secondAvatarUrl,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify score did not change
    const scoreAfterSecondUpdate = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    expect(scoreAfterSecondUpdate).toBe(scoreAfterFirstUpdate);
  });

  it('should award points when user sets bio for first time', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Get initial score
    const initialScore = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Set bio for the first time
    const bio = faker.lorem.paragraph();
    await updateUser(supabase, {
      id: testUser.id,
      bio,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify score increased by expected amount
    const expectedPoints = await getCachedActionPoints('profile.bio.written');
    await verifyTrustScoreIncrement(
      supabase,
      testUser.id,
      community.id,
      initialScore,
      expectedPoints,
      'Bio set',
    );

    // Verify log entry
    await verifyTrustScoreLog(
      serviceClient,
      testUser.id,
      community.id,
      ACTION_TYPES.PROFILE_BIO_WRITTEN,
      expectedPoints,
      'Bio set log',
    );
  });

  it('should not award points when user updates bio again', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Set bio for the first time
    const firstBio = faker.lorem.paragraph();
    await updateUser(supabase, {
      id: testUser.id,
      bio: firstBio,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get score after first update
    const scoreAfterFirstUpdate = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Update bio again
    const secondBio = faker.lorem.paragraph();
    await updateUser(supabase, {
      id: testUser.id,
      bio: secondBio,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify score did not change
    const scoreAfterSecondUpdate = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    expect(scoreAfterSecondUpdate).toBe(scoreAfterFirstUpdate);
  });

  it('should award points in all communities user is a member of', async () => {
    // Create first community
    const community1 = await createTestCommunity(supabase);

    // Create second community with different owner
    const owner2 = await createTestUser(supabase);
    await signIn(supabase, owner2.email, 'TestPass123!');
    const community2 = await createTestCommunity(supabase);

    // Join second community with original user
    await signIn(supabase, testUser.email, 'TestPass123!');
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    await joinCommunity(supabase, u!.id, community2.id);

    // Wait for join trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get initial scores in both communities
    const initialScore1 = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community1.id,
    );
    const initialScore2 = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community2.id,
    );

    // Set avatar for the first time
    const avatarUrl = faker.image.avatar();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify score increased in both communities
    const expectedPoints = await getCachedActionPoints('profile.picture.set');
    await verifyTrustScoreIncrement(
      supabase,
      testUser.id,
      community1.id,
      initialScore1,
      expectedPoints,
      'Profile picture set in community 1',
    );
    await verifyTrustScoreIncrement(
      supabase,
      testUser.id,
      community2.id,
      initialScore2,
      expectedPoints,
      'Profile picture set in community 2',
    );
  });

  it('should award points for both avatar and bio independently', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Get initial score
    const initialScore = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Set avatar first
    const avatarUrl = faker.image.avatar();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify avatar points awarded
    const avatarPoints = await getCachedActionPoints('profile.picture.set');
    const scoreAfterAvatar = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );
    expect(scoreAfterAvatar).toBe(initialScore + avatarPoints);

    // Set bio
    const bio = faker.lorem.paragraph();
    await updateUser(supabase, {
      id: testUser.id,
      bio,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify bio points also awarded
    const bioPoints = await getCachedActionPoints('profile.bio.written');
    const finalScore = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );
    expect(finalScore).toBe(initialScore + avatarPoints + bioPoints);
  });

  it('should award points when setting both avatar and bio in single update', async () => {
    // Create a community for the user
    const community = await createTestCommunity(supabase);

    // Get initial score
    const initialScore = await getCurrentTrustScore(
      supabase,
      testUser.id,
      community.id,
    );

    // Set both avatar and bio in single update
    const avatarUrl = faker.image.avatar();
    const bio = faker.lorem.paragraph();
    await updateUser(supabase, {
      id: testUser.id,
      avatarUrl,
      bio,
    });

    // Wait for trigger to complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify both sets of points were awarded
    const avatarPoints = await getCachedActionPoints('profile.picture.set');
    const bioPoints = await getCachedActionPoints('profile.bio.written');
    const expectedTotalPoints = avatarPoints + bioPoints;

    await verifyTrustScoreIncrement(
      supabase,
      testUser.id,
      community.id,
      initialScore,
      expectedTotalPoints,
      'Both avatar and bio set',
    );
  });
});
