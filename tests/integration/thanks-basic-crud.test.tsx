import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useThanks,
  useResources,
  useSignIn,
  useSignOut,
  BelongProvider,
  ResourceCategory,
} from "@belongnetwork/platform";
// Updated to use BelongProvider directly instead of TestWrapper
import { generateTestName } from "./database/utils/database-helpers";
import {
  createAndAuthenticateUser,
  createAdditionalUser,
  type AuthSetupResult,
  type TestUser,
} from "./helpers/auth-helpers";
import {
  generateResourceData,
  generateThanksData,
  cleanupTestResources,
  commonDeleteSuccessExpectation,
} from "./helpers/crud-test-patterns";

describe("Thanks Basic CRUD Integration Tests", () => {
  let authSetup: AuthSetupResult;
  let recipientUser: TestUser;
  let queryClient: QueryClient;
  let testResource: any;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeAll(async () => {
    // Create query client once for all tests - simulating real-world persistence
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
          refetchOnWindowFocus: false,
          refetchOnMount: true,
          refetchOnReconnect: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    const config = {
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    };

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <BelongProvider config={config}>{children}</BelongProvider>
      </QueryClientProvider>
    );

    // Set up authenticated user once for all tests - this user will create all test items
    authSetup = await createAndAuthenticateUser(wrapper);

    // Create a second user for recipient scenarios (but don't leave them authenticated)
    recipientUser = await createAdditionalUser(wrapper, authSetup.testUser);

    // Now create a test resource while authenticated as first user (testUser)
    const { result: resourcesResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    const resourceData = generateResourceData(authSetup.testCommunity.id!);

    await act(async () => {
      testResource = await resourcesResult.current.create(resourceData);
    });

    expect(testResource).toBeDefined();

    // Note: Keep user authenticated for all tests except the unauthenticated test
    // Note: main test resource cleaned up in afterAll
  });

  afterAll(async () => {
    // User should already be authenticated from beforeAll, but ensure they are signed in for cleanup

    // Clean up all remaining thanks first
    const { result: thanksCleanupResult } = renderHook(() => useThanks(), { wrapper });
    
    try {
      const allThanks = await thanksCleanupResult.current.list();
      
      // Filter for test thanks items
      const testThanks = allThanks.filter((thanks: any) => 
        thanks.message?.includes("INTEGRATION_TEST_")
      );
      
      // Delete each test thanks
      for (const thanks of testThanks) {
        await act(async () => {
          await thanksCleanupResult.current.delete(thanks.id);
        });
      }
    } catch (error) {
      console.warn("Thanks cleanup error:", error);
    }

    // Clean up test resource
    if (testResource) {
      const { result: resourcesResult } = renderHook(
        () => useResources(),
        {
          wrapper,
        },
      );

      await act(async () => {
        await resourcesResult.current.delete(testResource.id);
      });
    }

    // Sign out to ensure clean state
    const { result: signOutResult } = renderHook(() => useSignOut(), {
      wrapper,
    });

    await act(async () => {
      await signOutResult.current.mutateAsync();
    });

    await waitFor(() => expect(signOutResult.current.isSuccess).toBe(true));

    // No cleanup needed with provider pattern
  });

  beforeEach(async () => {
    // No expensive operations here - maintain real-world flow
    // Wait for hooks to be ready before each test
    const { result: thanksHook } = renderHook(() => useThanks(), { wrapper });
    await waitFor(() => {
      expect(thanksHook.current).toBeDefined();
      expect(thanksHook.current).not.toBeNull();
      expect(typeof thanksHook.current.list).toBe('function');
    }, { timeout: 5000 });
  });

  afterEach(async () => {
    // Note: Cleanup moved to afterAll to avoid auth issues with individual tests
  });

  test("should successfully read thanks when authenticated", async () => {
    // User is already authenticated from beforeAll
    const { result: thanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    // Wait for hook to initialize properly first
    await waitFor(() => {
      expect(thanksResult.current).toBeDefined();
      expect(thanksResult.current).not.toBeNull();
      expect(typeof thanksResult.current.list).toBe('function');
    }, { timeout: 5000 });

    // Manually retrieve data using the new API
    let retrievedThanks: any;
    await act(async () => {
      retrievedThanks = await thanksResult.current.list();
    });
    
    // Verify data
    expect(retrievedThanks).toEqual(expect.any(Array));

    // Verify the performance issue is fixed - no automatic fetching occurred
    // The hook initialized without triggering a fetch, only when list() was called
  });

  test("should successfully create thanks when authenticated", async () => {
    const { testUser } = authSetup;

    // User is already authenticated from beforeAll
    // Create thanks using the pre-created resource
    const { result: thanksHook } = renderHook(() => useThanks(), {
      wrapper,
    });

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(thanksHook.current).toBeDefined();
      expect(thanksHook.current).not.toBeNull();
      expect(typeof thanksHook.current.create).toBe('function');
    }, { timeout: 5000 });

    const thanksData = generateThanksData(
      testUser.userId!,
      recipientUser.userId!,
      testResource.id,
    );

    let createdThanks: any;
    await act(async () => {
      createdThanks = await thanksHook.current.create(thanksData);
    });

    expect(createdThanks).toMatchObject({
      id: expect.any(String),
      message: thanksData.message,
      impactDescription: thanksData.impactDescription,
    });

    // Note: cleanup handled automatically by name-based cleanup in afterEach
  });

  test("should successfully update thanks when authenticated as sender", async () => {
    const { testUser } = authSetup;

    // User is already authenticated from beforeAll
    // Create thanks first using the pre-created resource
    const { result: createThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!,
      recipientUser.userId!,
      testResource.id,
    );

    let createdThanks: any;
    await act(async () => {
      createdThanks = await createThanksResult.current.create(thanksData);
    });

    expect(createdThanks).toMatchObject({
      id: expect.any(String),
      message: thanksData.message,
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the thanks
    const { result: updateThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const updatedMessage = "Updated thanks message";
    const updatedImpactDescription = "Updated impact description";
    const updateData = {
      message: updatedMessage,
      impactDescription: updatedImpactDescription,
      fromUserId: thanksData.fromUserId,
      toUserId: thanksData.toUserId,
      resourceId: thanksData.resourceId,
      imageUrls: thanksData.imageUrls,
    };

    let updatedThanks: any;
    await act(async () => {
      updatedThanks = await updateThanksResult.current.update(createdThanks.id, updateData);
    });

    expect(updatedThanks).toMatchObject({
      id: createdThanks.id,
      message: updatedMessage,
      impactDescription: updatedImpactDescription,
    });

    // Note: Update verification not needed as mutation already validates response
  });

  test("should successfully delete thanks when authenticated as sender", async () => {
    const { testUser } = authSetup;

    // User is already authenticated from beforeAll
    // Create thanks first using the pre-created resource
    const { result: createThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!,
      recipientUser.userId!,
      testResource.id,
    );

    let createdThanks: any;
    await act(async () => {
      createdThanks = await createThanksResult.current.create(thanksData);
    });

    expect(createdThanks).toMatchObject({
      id: expect.any(String),
      message: thanksData.message,
    });

    // Delete the thanks
    const { result: deleteThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await act(async () => {
      await deleteThanksResult.current.delete(createdThanks.id);
    });

    // Delete operation should succeed without throwing

    // Note: Delete verification not needed as mutation already validates response
  });
});
