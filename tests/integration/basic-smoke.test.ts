import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useCurrentUser,
  useSignIn,
  useSignOut,
  useSignUp,
  useCommunities,
} from '../../src';
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from './helpers';

describe('Basic Smoke Tests', () => {
  beforeAll(() => {
    testWrapperManager.reset();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test('should initialize auth hooks without errors', async () => {
    // Test all auth hooks together
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      currentUser: useCurrentUser(),
      signIn: useSignIn(),
      signOut: useSignOut(),
      signUp: useSignUp(),
    }));

    // Check mutation hooks return functions
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
  });

  test('should initialize communities hook without errors', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCommunities(),
    );

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current.data).toBeInstanceOf(Array);
  });

  test('should be able to list communities without authentication', async () => {
    const { result } = await testUtils.renderHookWithWrapper(() =>
      useCommunities(),
    );

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });

    expect(result.current.data).toBeInstanceOf(Array);
  });

  test('should handle environment variables correctly', async () => {
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.VITE_MAPBOX_PUBLIC_TOKEN).toBeDefined();
  });
});
