import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestClient } from '../helpers/test-client';
import { createTestUser, TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData } from '../helpers/cleanup';
import * as api from '@/features/users/api';
import { signIn, signUp } from '@/features/auth/api';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';

describe('Users API - CRUD Operations', () => {
  let supabase: SupabaseClient<Database>;
  let testUser: User;
  let readOnlyUser1: User;
  let readOnlyUser2: User;

  beforeAll(async () => {
    supabase = createTestClient();

    // Create shared resources for read-only tests
    testUser = await createTestUser(supabase);

    // Sign in as testUser to ensure proper context
    await signIn(supabase, testUser.email, 'TestPass123!');

    // Create additional users for filtering tests
    readOnlyUser1 = await createTestUser(supabase);
    readOnlyUser2 = await createTestUser(supabase);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('fetchUsers', () => {
    it('fetches all users', async () => {
      const users = await api.fetchUsers(supabase);

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);

      // Verify our test users are included
      expect(users.some((u) => u.id === testUser.id)).toBe(true);
      expect(users.some((u) => u.id === readOnlyUser1.id)).toBe(true);
      expect(users.some((u) => u.id === readOnlyUser2.id)).toBe(true);
    });

    it('filters users by search term', async () => {
      const searchTerm = testUser.firstName.substring(0, 5);
      const filtered = await api.fetchUsers(supabase, { searchTerm });

      expect(Array.isArray(filtered)).toBe(true);
      expect(filtered.some((u) => u.id === testUser.id)).toBe(true);
    });

    it('supports pagination', async () => {
      const page1 = await api.fetchUsers(supabase, { page: 1, pageSize: 2 });
      expect(page1.length).toBeLessThanOrEqual(2);
    });
  });

  describe('fetchUserById', () => {
    it('returns user by id', async () => {
      const user = await api.fetchUserById(supabase, testUser.id);

      expect(user).toBeTruthy();
      expect(user!.id).toBe(testUser.id);
      expect(user!.email).toBe(testUser.email);
      expect(user!.firstName).toBe(testUser.firstName);
    });

    it('returns null for non-existent id', async () => {
      // Use a valid UUID format that doesn't exist
      const result = await api.fetchUserById(
        supabase,
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('updates user fields including bio', async () => {
      // Create a new user for updating via signUp
      const firstName = `${TEST_PREFIX}UpdateTest`;
      const lastName = 'Test';
      const email = `${TEST_PREFIX}update_${Date.now()}@example.com`;

      const createdUser = await signUp(
        supabase,
        email,
        'TestPass123!',
        firstName,
        lastName,
      );

      try {
        // Sign in as the new user (required for updateUser)
        await signIn(supabase, email, 'TestPass123!');

        const newBio = 'Updated bio content';
        const updatedUser = await api.updateUser(supabase, {
          id: createdUser.id,
          bio: newBio,
        });

        expect(updatedUser).toBeTruthy();
        expect(updatedUser!.id).toBe(createdUser.id);
        expect(updatedUser!.bio).toBe(newBio);

        // Verify database record has been updated with all expected fields
        const { data: dbRecord } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', createdUser.id)
          .single();

        expect(dbRecord).toMatchObject({
          id: createdUser.id,
          user_metadata: expect.objectContaining({
            bio: newBio,
          }),
        });
        expect(dbRecord!.updated_at).toBeTruthy();

        // Verify user can be fetched with bio field
        const fetchedUser = await api.fetchUserById(supabase, createdUser.id);
        expect(fetchedUser).toBeTruthy();
        expect(fetchedUser!.bio).toBe(newBio);
      } finally {
        // Sign back in as the original test user
        await signIn(supabase, testUser.email, 'TestPass123!');
      }
    });
  });
});
