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
import { isValidConnectionCode } from '@/features/invitations/utils/codeUtils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Community } from '@/features/communities';
import type { Account } from '@/features/auth/types';

describe('Invitations API - CRUD Operations', () => {
  let supabaseUserA: SupabaseClient<Database>;
  let supabaseUserB: SupabaseClient<Database>;
  let userA: Account;
  let userB: Account;
  let testCommunity: Community;

  beforeAll(async () => {
    // Create test users and community
    supabaseUserA = createTestClient();
    supabaseUserB = createTestClient();

    userA = await createTestUser(supabaseUserA);
    await signIn(supabaseUserA, userA.email, 'TestPass123!');

    userB = await createTestUser(supabaseUserB);
    await signIn(supabaseUserB, userB.email, 'TestPass123!');

    // Create community as userA (becomes organizer)
    testCommunity = await createTestCommunity(supabaseUserA);

    // UserB joins the community
    await joinCommunity(supabaseUserB, userB.id, testCommunity.id);

    // Wait for triggers to complete
    await new Promise((resolve) => setTimeout(resolve, 200));
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  beforeEach(async () => {
    // Clean up connections between tests
    await cleanupCommunityConnections(testCommunity.id);
  });

  describe('Invitation Codes', () => {
    it('auto-generates invitation code when user joins community', async () => {
      // Check that both users have invitation codes (auto-generated on join)
      const { data: codeA } = await supabaseUserA
        .from('invitation_codes')
        .select('*')
        .eq('user_id', userA.id)
        .eq('community_id', testCommunity.id)
        .single();

      const { data: codeB } = await supabaseUserB
        .from('invitation_codes')
        .select('*')
        .eq('user_id', userB.id)
        .eq('community_id', testCommunity.id)
        .single();

      expect(codeA).toBeTruthy();
      expect(codeB).toBeTruthy();
      expect(codeA!.code).toHaveLength(8);
      expect(codeB!.code).toHaveLength(8);
      expect(isValidConnectionCode(codeA!.code)).toBe(true);
      expect(isValidConnectionCode(codeB!.code)).toBe(true);
      expect(codeA!.code).not.toBe(codeB!.code); // Codes should be unique
    });

    it('retrieves existing invitation code', async () => {
      const invitationCode = await invitationsApi.getInvitationCode(
        supabaseUserA,
        userA.id,
        testCommunity.id,
      );

      expect(invitationCode).toBeTruthy();
      expect(invitationCode.code).toHaveLength(8);
      expect(invitationCode.userId).toBe(userA.id);
      expect(invitationCode.communityId).toBe(testCommunity.id);
      expect(invitationCode.isActive).toBe(true);
      expect(invitationCode.createdAt).toBeInstanceOf(Date);
      expect(invitationCode.updatedAt).toBeInstanceOf(Date);
      expect(isValidConnectionCode(invitationCode.code)).toBe(true);
    });

    it('returns same code on subsequent calls', async () => {
      const code1 = await invitationsApi.getInvitationCode(
        supabaseUserA,
        userA.id,
        testCommunity.id,
      );

      const code2 = await invitationsApi.getInvitationCode(
        supabaseUserA,
        userA.id,
        testCommunity.id,
      );

      expect(code1.code).toBe(code2.code);
      expect(code1.createdAt).toEqual(code2.createdAt);
    });

    it('generates unique codes for different users', async () => {
      const codeA = await invitationsApi.getInvitationCode(
        supabaseUserA,
        userA.id,
        testCommunity.id,
      );

      const codeB = await invitationsApi.getInvitationCode(
        supabaseUserB,
        userB.id,
        testCommunity.id,
      );

      expect(codeA.code).not.toBe(codeB.code);
      expect(codeA.userId).toBe(userA.id);
      expect(codeB.userId).toBe(userB.id);
    });

    it('regenerates invitation code', async () => {
      const originalCode = await invitationsApi.getInvitationCode(
        supabaseUserB,
        userB.id,
        testCommunity.id,
      );

      const newCode = await invitationsApi.regenerateInvitationCode(
        supabaseUserB,
        userB.id,
        testCommunity.id,
      );

      expect(newCode.code).not.toBe(originalCode.code);
      expect(newCode.userId).toBe(userB.id);
      expect(newCode.communityId).toBe(testCommunity.id);
      expect(newCode.isActive).toBe(true);
      expect(isValidConnectionCode(newCode.code)).toBe(true);

      // Original code should be inactive
      const { data: oldCodeData } = await supabaseUserB
        .from('invitation_codes')
        .select('is_active')
        .eq('code', originalCode.code)
        .single();

      expect(oldCodeData?.is_active).toBe(false);
    });
  });

  describe('Direct Connections', () => {
    it('creates direct connection between community members', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      expect(connection).toBeTruthy();
      expect(connection.id).toBeTruthy();
      expect(connection.communityId).toBe(testCommunity.id);
      expect(connection.type).toBe('invited_by');

      // Check that the connection exists in the database
      const { data: dbConnection } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('id', connection.id)
        .single();

      expect(dbConnection).toBeTruthy();
      expect(dbConnection!.user_id).toBeTruthy();
      expect(dbConnection!.other_id).toBeTruthy();
      expect(dbConnection!.community_id).toBe(testCommunity.id);
      expect(dbConnection!.type).toBe('invited_by');
    });

    it('prevents duplicate connections', async () => {
      // Create first connection
      const connection1 = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      expect(connection1.id).toBeTruthy();
      expect(connection1.communityId).toBe(testCommunity.id);

      // Try to create duplicate - should throw an error
      await expect(
        createTestConnection(supabaseUserA, supabaseUserB, testCommunity.id),
      ).rejects.toThrow('Connection was not created (possibly already exists)');
    });
  });

  describe('Connection Data Validation', () => {
    it('stores connection data correctly', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      // Direct database check
      const { data: dbConnection } = await supabaseUserA
        .from('user_connections')
        .select('*')
        .eq('id', connection.id)
        .single();

      expect(dbConnection!.user_id).toBeTruthy();
      expect(dbConnection!.other_id).toBeTruthy();
      expect(dbConnection!.community_id).toBe(testCommunity.id);
      expect(dbConnection!.type).toBe('invited_by');
    });

    it('maintains referential integrity', async () => {
      const connection = await createTestConnection(
        supabaseUserA,
        supabaseUserB,
        testCommunity.id,
      );

      // Verify all foreign keys are properly set
      expect(connection.userId).toBeTruthy();
      expect(connection.otherId).toBeTruthy();
      expect(connection.communityId).toBe(testCommunity.id);

      // Verify referenced records exist
      const { data: userProfile } = await supabaseUserA
        .from('profiles')
        .select('id')
        .eq('id', connection.userId)
        .single();

      const { data: otherProfile } = await supabaseUserB
        .from('profiles')
        .select('id')
        .eq('id', connection.otherId)
        .single();

      const { data: community } = await supabaseUserA
        .from('communities')
        .select('id')
        .eq('id', connection.communityId)
        .single();

      expect(userProfile).toBeTruthy();
      expect(otherProfile).toBeTruthy();
      expect(community).toBeTruthy();
    });
  });
});
