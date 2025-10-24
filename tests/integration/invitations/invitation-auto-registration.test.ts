import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import { signIn, signUp } from '@/features/auth/api';
import * as invitationsApi from '@/features/invitations/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { Account } from '@/features/auth/types';
import { faker } from '@faker-js/faker';

describe('Invitation Code Auto-Registration', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseNewUser: SupabaseClient<Database>;
  let userA: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create test user and community
    supabaseUserA = createTestClient();
    supabaseNewUser = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    // Create community as userA (becomes organizer and gets auto-assigned invitation code)
    testCommunity = await createTestCommunity(supabaseUserA);

    // Wait for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  it('auto-joins user to community and creates connection when signing up with invitation code', async () => {
    // Get userA's invitation code
    const invitationCode = await invitationsApi.getInvitationCode(
      supabaseUserA,
      userA.id,
      testCommunity.id,
    );

    expect(invitationCode).toBeTruthy();
    expect(invitationCode.code).toHaveLength(8);

    // Sign up a new user with the invitation code
    const newUserEmail = `${TEST_PREFIX}${faker.internet.email()}`;
    const newUserFirstName = faker.person.firstName();
    const newUserLastName = faker.person.lastName();

    const newUser = await signUp(
      supabaseNewUser,
      newUserEmail,
      'TestPass123!',
      newUserFirstName,
      newUserLastName,
      invitationCode.code, // Pass the invitation code
    );

    expect(newUser).toBeTruthy();
    expect(newUser.id).toBeTruthy();

    // Wait for trigger to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify the new user was auto-joined to the community
    const { data: membership } = await supabaseNewUser
      .from('community_memberships')
      .select('*')
      .eq('user_id', newUser.id)
      .eq('community_id', testCommunity.id)
      .single();

    expect(membership).toBeTruthy();
    expect(membership!.user_id).toBe(newUser.id);
    expect(membership!.community_id).toBe(testCommunity.id);

    // Verify a connection was created between userA (inviter) and newUser (invitee)
    const { data: connection } = await supabaseNewUser
      .from('user_connections')
      .select('*')
      .eq('user_id', userA.id) // userA is the inviter
      .eq('other_id', newUser.id) // newUser is the invitee
      .eq('type', 'invited')
      .single();

    expect(connection).toBeTruthy();
    expect(connection!.user_id).toBe(userA.id);
    expect(connection!.other_id).toBe(newUser.id);
    expect(connection!.type).toBe('invited');
  });
});
