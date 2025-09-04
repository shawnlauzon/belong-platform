import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import {
  createTestUser,
  createTestCommunity,
  createTestConnection,
} from '../helpers/test-data';
import {
  cleanupAllTestData,
  cleanupCommunityConnections,
} from '../helpers/cleanup';
import { signIn } from '@/features/auth/api';
import { joinCommunity } from '@/features/communities/api';
import * as invitationsApi from '@/features/invitations/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { Account } from '@/features/auth/types';

describe('Invitations API - Permissions and Security', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let supabaseUserC: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let userC: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create test users and community
    supabaseUserA = createTestClient();
    supabaseUserB = createTestClient();
    supabaseUserC = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    userB = await createTestUser(supabaseUserB);
    await signIn(supabaseUserB, userB.email, 'TestPass123!');

    userC = await createTestUser(supabaseUserC);
    await signIn(supabaseUserC, userC.email, 'TestPass123!');

    // Create community and join all users
    testCommunity = await createTestCommunity(supabaseUserA);
    await joinCommunity(supabaseUserB, testCommunity.id);
    await joinCommunity(supabaseUserC, testCommunity.id);

    // Wait for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await cleanupCommunityConnections(testCommunity.id);
  });

  describe('Row Level Security - Invitation Codes', () => {
    it('users can view active invitation codes for processing invitations', async () => {
      // This is necessary for invitation processing to work - users must be able to
      // lookup active codes when processing invitation links

      // Get userA's existing invitation code (created when they joined the community)
      const { data: codeA } = await supabaseUserA
        .from('invitation_codes')
        .select('*')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .single();

      if (!codeA) throw new Error('UserA should have an invitation code');

      // UserB should be able to query UserA's active code (needed for invitation processing)
      const { data: codeData } = await supabaseUserB
        .from('invitation_codes')
        .select('*')
        .eq('code', codeA.code)
        .eq('is_active', true);

      expect(codeData).toHaveLength(1);
      expect(codeData![0].code).toBe(codeA.code);
      expect(codeData![0].user_id).toBe(userA.id);
    });

    it('users can update their own invitation codes', async () => {
      // Create a dedicated user for this test to avoid polluting global users
      const supabaseTestUser = createTestClient();
      const testUser = await createTestUser(supabaseTestUser);
      await signIn(supabaseTestUser, testUser.email, 'TestPass123!');

      // Join the community (this creates an invitation code automatically)
      await joinCommunity(supabaseTestUser, testCommunity.id);

      // Wait for trigger to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // TestUser updates their own code's active status
      const { error } = await supabaseTestUser
        .from('invitation_codes')
        .update({ is_active: false })
        .eq('user_id', testUser.id)
        .eq('community_id', testCommunity.id);

      expect(error).toBeNull();

      // Verify the update worked
      const { data: updatedCode } = await supabaseTestUser
        .from('invitation_codes')
        .select('is_active')
        .eq('user_id', testUser.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(updatedCode!.is_active).toBe(false);
    });

    it('users cannot update other users invitation codes', async () => {
      // UserA already has an invitation code from joining the community

      await signIn(supabaseUserB, userB.email, 'TestPass123!');

      // UserB tries to update UserA's code
      await supabaseUserB
        .from('invitation_codes')
        .update({ is_active: false })
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id);

      await signIn(supabaseUserA, userA.email, 'TestPass123!');

      // Verify UserA's code wasn't changed
      const { data: unchangedCode } = await supabaseUserA
        .from('invitation_codes')
        .select('is_active')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .maybeSingle();

      expect(unchangedCode).toBeTruthy();
      expect(unchangedCode!.is_active).toBe(true); // Should remain unchanged
    });
  });

  describe('Row Level Security - User Connections', () => {
    it('users can only view their own connections', async () => {
      // Create connection between A and B
      const connectionAB = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      // Create connection between B and C (A not involved)
      const connectionBC = await createTestConnection(
        supabaseUserB,
        supabaseUserC,
        testCommunity.id,
      );

      // UserA should see connection AB but not BC
      const { data: connectionsForA } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // UserB should see both connections (involved in both)
      const { data: connectionsForB } = await supabaseUserB
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // UserC should see connection BC but not AB
      const { data: connectionsForC } = await supabaseUserC
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      expect(connectionsForA).toHaveLength(1);
      expect(connectionsForB).toHaveLength(2);
      expect(connectionsForC).toHaveLength(1);

      expect(connectionsForA![0].id).toBe(connectionAB.id);
      expect(connectionsForC![0].id).toBe(connectionBC.id);

      const connectionBIds = connectionsForB!.map((c) => c.id);
      expect(connectionBIds).toContain(connectionAB.id);
      expect(connectionBIds).toContain(connectionBC.id);
    });

    it('system can create connections through direct process', async () => {
      // The database function creates connections with elevated privileges
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      expect(connection).toBeTruthy();
      expect(connection.userId).toBeTruthy();
      expect(connection.otherId).toBeTruthy();
    });
  });

  describe('Cross-User Security Scenarios', () => {
    it('allows users to see all active invitation codes for invitation processing', async () => {
      // Users already have invitation codes from joining the community
      // Just verify they exist and are active

      // UserC should be able to query all active codes in the community (needed for invitation processing)
      const { data: allActiveCodes } = await supabaseUserC
        .from('invitation_codes')
        .select('*')
        .eq('community_id', testCommunity.id)
        .eq('is_active', true);

      // Should see all active codes including their own
      expect(allActiveCodes?.length).toBeGreaterThanOrEqual(3); // A, B, and C's codes
      const userIds = allActiveCodes!.map((code) => code.user_id);
      expect(userIds).toContain(userA.id);
      expect(userIds).toContain(userB.id);
      expect(userIds).toContain(userC.id);
    });

    it('prevents users from seeing connections between other users', async () => {
      // Create connection between A and B
      await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      // UserC tries to query the connection
      const { data: connectionsForC } = await supabaseUserC
        .from('user_connections')
        .select('*')
        .eq('community_id', testCommunity.id);

      // Should not see any connections (C is not involved in A-B connection)
      expect(connectionsForC).toHaveLength(0);
    });
  });

  describe('API Security Enforcement', () => {
    it('getInvitationCode only returns user own code', async () => {
      const codeA = await invitationsApi.getInvitationCode(
        supabaseUserA,
        testCommunity.id,
      );

      const codeB = await invitationsApi.getInvitationCode(
        supabaseUserB,
        testCommunity.id,
      );

      expect(codeA.userId).toBe(userA.id);
      expect(codeB.userId).toBe(userB.id);
      expect(codeA.code).not.toBe(codeB.code);
    });
  });
});