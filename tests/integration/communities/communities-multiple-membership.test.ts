import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/communities/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { Community } from '@/features';

describe('Communities API - Multiple Membership Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let community1: Community;
  let community2: Community;
  let community3: Community;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create organizer user who will create communities
    await createTestUser(supabase);

    // Create multiple communities for testing (organizer becomes member automatically)
    community1 = await createTestCommunity(supabase);
    community2 = await createTestCommunity(supabase);
    community3 = await createTestCommunity(supabase);

    // Create test user who will join communities
    testUser = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('allows user to join multiple communities', async () => {
    // Join first community
    const membership1 = await api.joinCommunity(supabase, community1.id);
    expect(membership1!.userId).toBe(testUser.id);
    expect(membership1!.communityId).toBe(community1.id);

    // Join second community
    const membership2 = await api.joinCommunity(supabase, community2.id);
    expect(membership2!.userId).toBe(testUser.id);
    expect(membership2!.communityId).toBe(community2.id);

    // Join third community
    const membership3 = await api.joinCommunity(supabase, community3.id);
    expect(membership3!.userId).toBe(testUser.id);
    expect(membership3!.communityId).toBe(community3.id);

    // Verify all memberships exist in database
    const { data: dbMemberships } = await supabase
      .from('community_memberships')
      .select()
      .eq('user_id', testUser.id);

    expect(dbMemberships).toHaveLength(3);

    const communityIds = dbMemberships!.map((m) => m.community_id);
    expect(communityIds).toContain(community1.id);
    expect(communityIds).toContain(community2.id);
    expect(communityIds).toContain(community3.id);

    // Verify fetchUserCommunities returns all communities
    const userCommunities = await api.fetchUserCommunities(
      supabase,
      testUser.id,
    );
    expect(userCommunities).toHaveLength(3);

    const userCommunityIds = userCommunities.map((m) => m.communityId);
    expect(userCommunityIds).toContain(community1.id);
    expect(userCommunityIds).toContain(community2.id);
    expect(userCommunityIds).toContain(community3.id);
  });

  it('allows independent leaving of communities', async () => {
    // First join all communities (user is member of all three from previous test)
    // Note: we don't rejoin here since user should already be a member from previous test

    // Leave middle community
    await api.leaveCommunity(supabase, community2.id);

    // Verify user still member of other two communities
    const userCommunities = await api.fetchUserCommunities(
      supabase,
      testUser.id,
    );
    expect(userCommunities).toHaveLength(2);

    const remainingCommunityIds = userCommunities.map((m) => m.communityId);
    expect(remainingCommunityIds).toContain(community1.id);
    expect(remainingCommunityIds).toContain(community3.id);
    expect(remainingCommunityIds).not.toContain(community2.id);

    // Verify database state
    const { data: dbMemberships } = await supabase
      .from('community_memberships')
      .select()
      .eq('user_id', testUser.id);

    expect(dbMemberships).toHaveLength(2);

    const dbCommunityIds = dbMemberships!.map((m) => m.community_id);
    expect(dbCommunityIds).toContain(community1.id);
    expect(dbCommunityIds).toContain(community3.id);
    expect(dbCommunityIds).not.toContain(community2.id);
  });

  it('prevents duplicate membership across multiple joins', async () => {
    // User should already be a member of community1 from the first test
    // Attempt to join same community again should fail with meaningful error
    await expect(api.joinCommunity(supabase, community1.id)).rejects.toThrow();

    // Should still only have one membership for this community
    const { data: dbMemberships } = await supabase
      .from('community_memberships')
      .select()
      .eq('user_id', testUser.id)
      .eq('community_id', community1.id);

    expect(dbMemberships).toHaveLength(1);
  });
});
