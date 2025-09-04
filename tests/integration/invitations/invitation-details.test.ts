import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as connectionsApi from '@/features/invitations/api';
import * as usersApi from '@/features/users/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Account } from '@/features/auth/types';
import type { Community } from '@/features/communities/types';
import { getInvitationCode } from '@/features';
import { faker } from '@faker-js/faker';

describe('Connections API - Connection Details', () => {
  let supabase: SupabaseClient<Database>;
  let member: Account;
  let testCommunity: Community;
  let memberConnectionCode: string;

  beforeAll(async () => {
    supabase = createTestClient();

    member = await createTestUser(supabase);
    member = await usersApi.updateUser(supabase, {
      id: member.id,
      avatarUrl: faker.image.avatar(),
    });

    testCommunity = await createTestCommunity(supabase);

    memberConnectionCode = (
      await getInvitationCode(supabase, testCommunity.id)
    ).code;

    await signOut(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchInvitationDetails', () => {
    it('returns connection details by code when unauthenticated', async () => {
      // Ensure we're not authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      expect(user).toBeNull();

      const connectionDetails = await connectionsApi.fetchInvitationDetails(
        supabase,
        memberConnectionCode,
      );

      expect(connectionDetails).not.toBeNull();
      expect(connectionDetails).toEqual({
        user: {
          id: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          fullName: member.fullName,
          avatarUrl: member.avatarUrl,
        },
        communityId: testCommunity.id,
        isActive: true,
        createdAt: expect.any(Date),
      });

      // Ensure comprehensive connection details are returned
      expect(connectionDetails).toHaveProperty('user');
      expect(connectionDetails).toHaveProperty('communityId');
      expect(connectionDetails).toHaveProperty('isActive');
      expect(connectionDetails).toHaveProperty('createdAt');

      // Ensure user object has required fields
      expect(connectionDetails?.user).toHaveProperty('id');
      expect(connectionDetails?.user).toHaveProperty('firstName');
      expect(connectionDetails?.user).toHaveProperty('lastName');
      expect(connectionDetails?.user).toHaveProperty('fullName');
      expect(connectionDetails?.user).toHaveProperty('avatarUrl');
    });

    it('returns null for non-existent connection code when unauthenticated', async () => {
      // Ensure we're not authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      expect(user).toBeNull();

      const nonExistentConnectionCode = 'INVALID123';
      const connectionDetails = await connectionsApi.fetchInvitationDetails(
        supabase,
        nonExistentConnectionCode,
      );

      expect(connectionDetails).toBeNull();
    });

    it('returns null for inactive connection code', async () => {
      // Sign in to deactivate the connection code
      await signIn(supabase, member.email, 'TestPass123!');

      // Deactivate the invitation code
      await supabase
        .from('invitation_codes')
        .update({ is_active: false })
        .eq('code', memberConnectionCode);

      await signOut(supabase);

      // Try to fetch with inactive code
      const connectionDetails = await connectionsApi.fetchInvitationDetails(
        supabase,
        memberConnectionCode,
      );
      expect(connectionDetails).toBeNull();

      // Reactivate for cleanup
      await signIn(supabase, member.email, 'TestPass123!');
      await supabase
        .from('invitation_codes')
        .update({ is_active: true })
        .eq('code', memberConnectionCode);
      await signOut(supabase);
    });

    it('includes correct community information', async () => {
      const connectionDetails = await connectionsApi.fetchInvitationDetails(
        supabase,
        memberConnectionCode,
      );

      expect(connectionDetails).not.toBeNull();
      expect(connectionDetails?.communityId).toBe(testCommunity.id);
    });

    it('includes proper timestamps and connection status', async () => {
      const connectionDetails = await connectionsApi.fetchInvitationDetails(
        supabase,
        memberConnectionCode,
      );

      expect(connectionDetails).not.toBeNull();
      expect(connectionDetails?.isActive).toBe(true);
      expect(connectionDetails?.createdAt).toBeInstanceOf(Date);

      // Check that the timestamp is reasonable (within the last hour)
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      expect(connectionDetails?.createdAt.getTime()).toBeGreaterThan(
        hourAgo.getTime(),
      );
      expect(connectionDetails?.createdAt.getTime()).toBeLessThanOrEqual(
        now.getTime(),
      );
    });
  });
});
