import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, createTestCommunity } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/users/api';
import { signIn, signOut } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import type { Community } from '@/features/communities/types';
import { getMemberConnectionCode } from '@/features';
import { faker } from '@faker-js/faker';

describe('Users API - Public Information by Connection Code', () => {
  let supabase: SupabaseClient<Database>;
  let member: User;
  let testCommunity: Community;
  let memberConnectionCode: string;

  beforeAll(async () => {
    supabase = createTestClient();

    member = await createTestUser(supabase);
    member = await api.updateUser(supabase, {
      id: member.id,
      avatarUrl: faker.image.avatar(),
    });

    testCommunity = await createTestCommunity(supabase);

    memberConnectionCode = (
      await getMemberConnectionCode(supabase, testCommunity.id)
    ).code;

    await signOut(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchUserPublicInfo', () => {
    it('returns public user info by connection code when unauthenticated', async () => {
      // Ensure we're not authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      expect(user).toBeNull();

      const publicInfo = await api.fetchUserPublicInfo(
        supabase,
        memberConnectionCode,
      );

      expect(publicInfo).not.toBeNull();
      expect(publicInfo).toEqual({
        id: member.id,
        firstName: member.firstName,
        avatarUrl: member.avatarUrl,
      });

      // Ensure only public fields are returned
      expect(publicInfo).not.toHaveProperty('email');
      expect(publicInfo).not.toHaveProperty('bio');
      expect(publicInfo).not.toHaveProperty('location');
      expect(publicInfo).not.toHaveProperty('lastName');
      expect(publicInfo).not.toHaveProperty('fullName');
    });

    it('returns null for non-existent connection code when unauthenticated', async () => {
      // Ensure we're not authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser();
      expect(user).toBeNull();

      const nonExistentConnectionCode = 'INVALID123';
      const publicInfo = await api.fetchUserPublicInfo(
        supabase,
        nonExistentConnectionCode,
      );

      expect(publicInfo).toBeNull();
    });

    it('returns null for inactive connection code', async () => {
      // Sign in to deactivate the connection code
      await signIn(supabase, member.email, 'TestPass123!');

      // Deactivate the connection code
      await supabase
        .from('community_member_codes')
        .update({ is_active: false })
        .eq('code', memberConnectionCode);

      await signOut(supabase);

      // Try to fetch with inactive code
      const publicInfo = await api.fetchUserPublicInfo(
        supabase,
        memberConnectionCode,
      );
      expect(publicInfo).toBeNull();

      // Reactivate for cleanup
      await signIn(supabase, member.email, 'TestPass123!');
      await supabase
        .from('community_member_codes')
        .update({ is_active: true })
        .eq('code', memberConnectionCode);
      await signOut(supabase);
    });
  });
});
