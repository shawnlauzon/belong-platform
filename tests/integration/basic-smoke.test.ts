import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
} from "vitest";
import {
  renderHook,
  act,
  waitFor,
} from "@testing-library/react";
import {
  useCurrentUser,
  useSignIn,
  useSignOut,
  useSignUp,
  useCommunities,
} from "../../src";
import {
  TestDataFactory,
  authHelper,
  cleanupHelper,
  testWrapperManager,
  testUtils,
} from "./helpers";

describe("Basic Smoke Tests", () => {
  const wrapper = testWrapperManager.getWrapper();

  beforeAll(() => {
    testWrapperManager.reset();
  });

  afterAll(async () => {
    await cleanupHelper.cleanupAfterAllTests();
  });

  test("should initialize auth hooks without errors", async () => {
    // Test all auth hooks together
    const { result } = await testUtils.renderHookWithWrapper(() => ({
      currentUser: useCurrentUser(),
      signIn: useSignIn(),
      signOut: useSignOut(),
      signUp: useSignUp(),
    }));

    // Wait for useCurrentUser to initialize
    await testUtils.waitForHookToInitialize(
      { current: result.current.currentUser },
      (query) => query.isLoading !== undefined
    );

    // Check useCurrentUser returns React Query state
    expect(result.current.currentUser.data ?? null).toBeNull(); // Not authenticated
    expect(typeof result.current.currentUser.isLoading).toBe('boolean');
    expect(result.current.currentUser.error).toBeNull();

    // Check mutation hooks return functions
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
    expect(typeof result.current.signUp).toBe('function');
  });

  test("should initialize communities hook without errors", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined
    );

    // Check useCommunities returns React Query state
    expect(typeof result.current.isLoading).toBe('boolean');
    expect(result.current.error).toBeNull();
    expect(Array.isArray(result.current.data) || result.current.data === undefined).toBe(true);
  });

  test("should be able to list communities without authentication", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      result,
      (query) => query.isLoading !== undefined
    );

    // Wait for query to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 10000 }
    );

    // useCommunities should return data directly (auto-fetching)
    expect(Array.isArray(result.current.data)).toBe(true);
    // Don't expect any specific communities, just that it returns an array
  });

  test("should create test data without errors", async () => {
    const testUser = TestDataFactory.createUser();
    const testCommunity = TestDataFactory.createCommunity();
    const testResource = TestDataFactory.createResource();

    expect(testUser).toHaveProperty('email');
    expect(testUser).toHaveProperty('password');
    expect(testUser).toHaveProperty('firstName');
    expect(testUser).toHaveProperty('lastName');

    expect(testCommunity).toHaveProperty('name');
    expect(testCommunity).toHaveProperty('description');
    expect(testCommunity).toHaveProperty('level');

    expect(testResource).toHaveProperty('title');
    expect(testResource).toHaveProperty('description');
    expect(testResource).toHaveProperty('type');
  });

  test("should handle environment variables correctly", async () => {
    expect(process.env.VITE_SUPABASE_URL).toBeDefined();
    expect(process.env.VITE_SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.VITE_MAPBOX_PUBLIC_TOKEN).toBeDefined();
  });
});