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
  useAuth,
  useCommunities,
} from "@belongnetwork/platform";
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

  test("should initialize auth hook without errors", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useAuth());

    await testUtils.waitForHookToInitialize(
      result,
      (auth) => typeof auth.signUp === 'function' && typeof auth.signIn === 'function'
    );

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.currentUser).toBeNull();
    expect(typeof result.current.signUp).toBe('function');
    expect(typeof result.current.signIn).toBe('function');
    expect(typeof result.current.signOut).toBe('function');
  });

  test("should initialize communities hook without errors", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      result,
      (communities) => typeof communities.list === 'function'
    );

    expect(typeof result.current.list).toBe('function');
    expect(typeof result.current.create).toBe('function');
    expect(typeof result.current.update).toBe('function');
    expect(typeof result.current.delete).toBe('function');
  });

  test("should be able to list communities without authentication", async () => {
    const { result } = await testUtils.renderHookWithWrapper(() => useCommunities());

    await testUtils.waitForHookToInitialize(
      result,
      (communities) => typeof communities.list === 'function'
    );

    const communities = await testUtils.performAsyncAction(
      () => result.current.list(),
      "list communities"
    );

    expect(Array.isArray(communities)).toBe(true);
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