import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
} from '../../../src/features/auth/api';

// Simple test data
const createTestCredentials = () => ({
  email: `test-auth-${Date.now()}-${Math.random().toString(36).substr(2, 6)}@example.com`,
  password: 'TestPassword123!',
  firstName: 'TestAuthFirst',
  lastName: 'TestAuthLast',
});

// Simple cleanup function
const cleanupTestUsers = async (supabase: any) => {
  // Note: We can't easily delete auth users with anon key
  // In a real test environment, this would use admin credentials
  console.log('Auth cleanup: Would delete test users in production test environment');
};

describe('Auth API Integration Tests', () => {
  let supabase: any;
  let testCredentials: ReturnType<typeof createTestCredentials>;

  beforeEach(() => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!
    );
    testCredentials = createTestCredentials();
  });

  afterEach(async () => {
    // Always sign out to clean up session
    try {
      await signOut(supabase);
    } catch (error) {
      // Ignore errors - user might not be signed in
    }
    await cleanupTestUsers(supabase);
  });

  test('signUp should create new account and return Account object', async () => {
    const account = await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.email).toBe(testCredentials.email);
    expect(account.firstName).toBe(testCredentials.firstName);
    expect(account.lastName).toBe(testCredentials.lastName);
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
    expect(typeof account.id).toBe('string');
  });

  test('signUp should throw error for invalid email', async () => {
    await expect(signUp(
      supabase,
      'invalid-email',
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    )).rejects.toThrow();
  });

  test('signUp should throw error for weak password', async () => {
    await expect(signUp(
      supabase,
      testCredentials.email,
      '123', // Too weak
      testCredentials.firstName,
      testCredentials.lastName
    )).rejects.toThrow();
  });

  test('signUp should throw error for duplicate email', async () => {
    // First signup
    await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Second signup with same email should fail
    await expect(signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      'DifferentFirst',
      'DifferentLast'
    )).rejects.toThrow();
  });

  test('signIn should authenticate existing user and return Account object', async () => {
    // First create a user
    await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Sign out first
    await signOut(supabase);

    // Then sign in
    const account = await signIn(
      supabase,
      testCredentials.email,
      testCredentials.password
    );

    expect(account).toBeDefined();
    expect(account.id).toBeDefined();
    expect(account.email).toBe(testCredentials.email);
    expect(account.firstName).toBe(testCredentials.firstName);
    expect(account.createdAt).toBeInstanceOf(Date);
    expect(account.updatedAt).toBeInstanceOf(Date);
  });

  test('signIn should throw error for non-existent user', async () => {
    await expect(signIn(
      supabase,
      'nonexistent@example.com',
      'password123'
    )).rejects.toThrow();
  });

  test('signIn should throw error for wrong password', async () => {
    // First create a user
    await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Sign out first
    await signOut(supabase);

    // Try to sign in with wrong password
    await expect(signIn(
      supabase,
      testCredentials.email,
      'wrongpassword'
    )).rejects.toThrow();
  });

  test('getCurrentUser should return User object when signed in', async () => {
    // First create and sign in a user
    await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Get current user should work now
    const user = await getCurrentUser(supabase);

    expect(user).toBeDefined();
    expect(user!.id).toBeDefined();
    expect(user!.email).toBe(testCredentials.email);
    expect(user!.firstName).toBe(testCredentials.firstName);
    expect(user!.createdAt).toBeInstanceOf(Date);
    expect(user!.updatedAt).toBeInstanceOf(Date);
  });

  test('getCurrentUser should return null when not signed in', async () => {
    // Make sure we're signed out
    await signOut(supabase);

    const user = await getCurrentUser(supabase);

    expect(user).toBeNull();
  });

  test('signOut should clear authentication session', async () => {
    // First create and sign in a user
    await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Verify we're signed in
    let user = await getCurrentUser(supabase);
    expect(user).not.toBeNull();

    // Sign out
    await signOut(supabase);

    // Verify we're signed out
    user = await getCurrentUser(supabase);
    expect(user).toBeNull();
  });

  test('signOut should not throw error when already signed out', async () => {
    // Make sure we're signed out
    await signOut(supabase);

    // Sign out again should not throw
    await expect(signOut(supabase)).resolves.not.toThrow();
  });

  test('API functions should handle database connection errors', async () => {
    // Create a client with invalid credentials
    const invalidSupabase = createClient(
      'https://invalid.supabase.co',
      'invalid-key'
    );

    // These should handle errors gracefully or throw expected errors
    await expect(signUp(
      invalidSupabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    )).rejects.toThrow();

    await expect(signIn(
      invalidSupabase,
      testCredentials.email,
      testCredentials.password
    )).rejects.toThrow();

    const user = await getCurrentUser(invalidSupabase);
    expect(user).toBeNull();
  });

  test('signUp should handle missing firstName gracefully', async () => {
    // Test with empty firstName
    await expect(signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      '', // Empty firstName
      testCredentials.lastName
    )).rejects.toThrow();
  });

  test('signUp should handle optional lastName', async () => {
    // Test without lastName
    const account = await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName
      // No lastName
    );

    expect(account).toBeDefined();
    expect(account.firstName).toBe(testCredentials.firstName);
    expect(account.lastName).toBeUndefined();
  });

  test('auth flow should maintain session across API calls', async () => {
    // Sign up user
    const signedUpAccount = await signUp(
      supabase,
      testCredentials.email,
      testCredentials.password,
      testCredentials.firstName,
      testCredentials.lastName
    );

    // Should be able to get current user immediately after signup
    const currentUser = await getCurrentUser(supabase);
    expect(currentUser).not.toBeNull();
    expect(currentUser!.id).toBe(signedUpAccount.id);

    // Sign out and back in
    await signOut(supabase);
    const signedInAccount = await signIn(
      supabase,
      testCredentials.email,
      testCredentials.password
    );

    // Should be the same user
    expect(signedInAccount.id).toBe(signedUpAccount.id);

    // Should be able to get current user after sign in
    const currentUser2 = await getCurrentUser(supabase);
    expect(currentUser2).not.toBeNull();
    expect(currentUser2!.id).toBe(signedUpAccount.id);
  });
});