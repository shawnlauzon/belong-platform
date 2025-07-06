import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestClient, createServiceClient } from '../helpers/test-client';
import { TEST_PREFIX } from '../helpers/test-data';
import { cleanupAllTestData, cleanupUser } from '../helpers/cleanup';
import * as api from '@/features/auth/api';
import { faker } from '@faker-js/faker';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';
import { createTestUser } from '../helpers/test-data';

// Helper to avoid rate limiting
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Auth API - Integration Tests', () => {
  let supabase: SupabaseClient<Database>;
  let serviceClient: SupabaseClient<Database>;
  let testUser: User;
  const testPassword = 'TestPass123!';

  beforeAll(async () => {
    supabase = createTestClient();
    serviceClient = createServiceClient();

    testUser = await createTestUser(supabase);
  });

  beforeEach(async () => {
    // Add delay to avoid rate limiting
    await delay(200);
  });

  afterAll(async () => {
    await cleanupAllTestData();
  });

  describe('signUp', () => {
    it('creates new account with valid data', async () => {
      const email = `${TEST_PREFIX}${faker.internet.email()}`;
      const password = 'TestPass123!';
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const account = await api.signUp(
        supabase,
        email,
        password,
        firstName,
        lastName,
      );

      expect(account).toMatchObject({
        email: email.toLowerCase(), // Supabase converts emails to lowercase
        firstName,
        lastName,
        id: expect.any(String),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Verify user was created in auth.users
      const { data: authUser } = await serviceClient.auth.admin.getUserById(
        account.id,
      );
      expect(authUser.user).toMatchObject({
        email: email.toLowerCase(), // Supabase converts emails to lowercase
        id: account.id,
      });
    });

    it('creates user profile in profiles table', async () => {
      const email = `${TEST_PREFIX}${faker.internet.email()}`;
      const password = 'TestPass123!';
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const account = await api.signUp(
        supabase,
        email,
        password,
        firstName,
        lastName,
      );

      // Check profile was created
      const { data: profile } = await serviceClient
        .from('profiles')
        .select('*')
        .eq('id', account.id)
        .single();

      expect(profile).toMatchObject({
        email: email.toLowerCase(), // Supabase converts emails to lowercase
        user_metadata: expect.objectContaining({
          first_name: firstName,
          last_name: lastName,
        }),
      });
    });

    it('fails with duplicate email', async () => {
      // User already signed up
      await expect(
        api.signUp(supabase, testUser.email, 'TestPass123!', 'Test'),
      ).rejects.toThrow();
    });

    it('fails with invalid email format', async () => {
      await expect(
        api.signUp(
          supabase,
          'invalid-email',
          'TestPass123!',
          faker.person.firstName(),
        ),
      ).rejects.toThrow();
    });

    it('fails with weak password', async () => {
      await expect(
        api.signUp(
          supabase,
          `${TEST_PREFIX}${faker.internet.email()}`,
          '123', // Too weak
          faker.person.firstName(),
        ),
      ).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    beforeEach(async () => {
      // Sign out to ensure clean state
      await api.signOut(supabase);
    });

    it('signs in with valid credentials', async () => {
      const account = await api.signIn(supabase, testUser.email, testPassword);

      expect(account).toMatchObject({
        id: testUser.id,
        email: testUser.email.toLowerCase(), // Supabase converts emails to lowercase
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
    });

    it('establishes active session after sign in', async () => {
      await api.signIn(supabase, testUser.email, testPassword);

      // Verify session exists
      const {
        data: { session },
      } = await supabase.auth.getSession();
      expect(session).toBeTruthy();
      expect(session?.user).toMatchObject({
        email: testUser.email.toLowerCase(), // Supabase converts emails to lowercase
      });
    });

    it('fails with incorrect password', async () => {
      await expect(
        api.signIn(supabase, testUser.email, 'WrongPassword123!'),
      ).rejects.toThrow();
    });

    it('fails with non-existent email', async () => {
      await expect(
        api.signIn(
          supabase,
          `${TEST_PREFIX}nonexistent_${faker.internet.email()}`,
          testPassword,
        ),
      ).rejects.toThrow();
    });

    it('fails with invalid email format', async () => {
      await expect(
        api.signIn(supabase, 'not-an-email', testPassword),
      ).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('returns current authenticated user', async () => {
      // Ensure we're signed in
      await api.signIn(supabase, testUser.email, testPassword);

      const user = await api.getCurrentUser(supabase);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email.toLowerCase(), // Supabase converts emails to lowercase
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      // fullName might not be set by the trigger
    });

    it('returns right after signing up', async () => {
      const testUser2 = await createTestUser(supabase);

      try {
        await expect(api.getCurrentUser(supabase)).resolves.toMatchObject({
          id: testUser2.id,
        });
      } finally {
        await cleanupUser(testUser2.id);
      }
    });

    it('returns null when not authenticated', async () => {
      // Sign out first
      await api.signOut(supabase);

      const user = await api.getCurrentUser(supabase);
      expect(user).toBeNull();
    });
  });

  describe('signOut', () => {
    beforeEach(async () => {
      // Sign in first
      await api.signIn(supabase, testUser.email, testPassword);
    });

    it('clears authentication session', async () => {
      // Verify we have a session before sign out
      const {
        data: { session: sessionBefore },
      } = await supabase.auth.getSession();
      expect(sessionBefore).toBeTruthy();

      // Sign out
      await api.signOut(supabase);

      // Verify session is cleared
      const {
        data: { session: sessionAfter },
      } = await supabase.auth.getSession();
      expect(sessionAfter).toBeNull();
    });

    it('prevents access to authenticated endpoints after sign out', async () => {
      // Sign out
      await api.signOut(supabase);

      // getCurrentUser should return null
      const user = await api.getCurrentUser(supabase);
      expect(user).toBeNull();
    });

    it('can sign out multiple times without error', async () => {
      // First sign out
      await api.signOut(supabase);

      // Second sign out should not throw
      await expect(api.signOut(supabase)).resolves.not.toThrow();
    });
  });

  describe('Authentication Flow Integration', () => {
    it('completes full authentication lifecycle', async () => {
      const email = `${TEST_PREFIX}lifecycle_${testUser.email}`;
      const password = 'TestPass123!';
      const firstName = faker.person.firstName(); // faker.person.firstName();
      const lastName = faker.person.lastName(); // faker.person.lastName();

      // 1. Sign up new user
      const signUpAccount = await api.signUp(
        supabase,
        email,
        password,
        firstName,
        lastName,
      );
      expect(signUpAccount).toMatchObject({
        email: email.toLowerCase(), // Supabase converts emails to lowercase
      });

      // 2. User should be automatically signed in after signup
      const userAfterSignUp = await api.getCurrentUser(supabase);
      expect(userAfterSignUp).toMatchObject({
        id: signUpAccount.id,
      });

      // 3. Sign out
      await api.signOut(supabase);
      const userAfterSignOut = await api.getCurrentUser(supabase);
      expect(userAfterSignOut).toBeNull();

      // 4. Sign back in
      const signInAccount = await api.signIn(supabase, email, password);
      expect(signInAccount).toMatchObject({
        id: signUpAccount.id,
      });

      // 5. Verify user is authenticated
      const currentUser = await api.getCurrentUser(supabase);
      expect(currentUser).toMatchObject({
        id: signUpAccount.id,
        email: email.toLowerCase(), // Supabase converts emails to lowercase
        firstName,
        lastName,
      });
    });

    it('tracks different users signing in and out', async () => {
      await api.signIn(supabase, testUser.email, testPassword);

      await expect(api.getCurrentUser(supabase)).resolves.toMatchObject({
        id: testUser.id,
      });

      const testUser2 = await createTestUser(supabase);

      try {
        await expect(api.getCurrentUser(supabase)).resolves.toMatchObject({
          id: testUser2.id,
        });
      } finally {
        await cleanupUser(testUser2.id);
      }
    });
  });
});
