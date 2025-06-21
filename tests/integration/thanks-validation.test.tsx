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
  useSignUp,
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
} from "./helpers/crud-test-patterns";
import { faker } from "@faker-js/faker";

describe("Thanks Validation Integration Tests", () => {
  let authSetup: AuthSetupResult;
  let recipientUser: TestUser;
  let queryClient: QueryClient;
  let testResource: any;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeAll(async () => {
    const config = {
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    };
    const tempQueryClient = new QueryClient({
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
    const tempWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={tempQueryClient}>
        <BelongProvider config={config}>{children}</BelongProvider>
      </QueryClientProvider>
    );

    // Set up authenticated user once for all tests - this user will create all test items
    authSetup = await createAndAuthenticateUser(tempWrapper);

    // Create a second user for recipient scenarios (but don't leave them authenticated)
    recipientUser = await createAdditionalUser(tempWrapper, authSetup.testUser);

    // User is already authenticated from createAndAuthenticateUser above

    // Now create a test resource while authenticated as first user (testUser)
    const { result: createResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper: tempWrapper,
      },
    );

    const resourceData = generateResourceData(authSetup.testCommunity.id!);

    await act(async () => {
      testResource = await createResourceResult.current.create(resourceData);
    });

    expect(testResource).toBeDefined();
    // Note: main test resource cleaned up in afterAll
  });

  afterAll(async () => {
    // Sign in as the original user for cleanup
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      await signInResult.current.mutateAsync({
        email: authSetup.testUser.email,
        password: authSetup.testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Clean up test resource
    if (testResource) {
      const { result: deleteResourceResult } = renderHook(
        () => useResources(),
        {
          wrapper,
        },
      );

      await act(async () => {
        await deleteResourceResult.current.delete(testResource.id);
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
    
    // Wait for hooks to be ready before each test
    const { result: thanksHook } = renderHook(() => useThanks(), { wrapper });
    await waitFor(() => {
      expect(thanksHook.current).toBeDefined();
      expect(thanksHook.current).not.toBeNull();
    }, { timeout: 15000 });
  });

  afterEach(async () => {
    // Clean up only test data, not application state (like real world)
    await cleanupTestResources(
      wrapper,
      "thanks",
      () => renderHook(() => useThanks(), { wrapper }),
      () => renderHook(() => useThanks(), { wrapper }),
      act,
      waitFor,
    );
  });

  test("should fail to create thanks when user tries to thank themselves", async () => {
    const { testUser } = authSetup;

    // Try to create thanks with same user as sender and receiver using shared resource
    const { result: createThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const selfThanksData = {
      fromUserId: testUser.userId!,
      toUserId: testUser.userId!, // Same as sender - should fail
      resourceId: testResource.id,
      message: faker.lorem.sentence(),
      impactDescription: faker.lorem.paragraph(),
      imageUrls: [],
    };

    let error: any;
    await act(async () => {
      try {
        await createThanksResult.current.create(selfThanksData);
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeDefined();
    expect(error.message).toBe("Cannot thank yourself");
  });

  test("should fail to update thanks when trying to change sender", async () => {
    const { testUser } = authSetup;

    // Use pre-created third user

    // Create thanks first
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

    expect(createdThanks).toBeDefined();
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Try to update thanks with different sender
    const { result: updateThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const updateDataWithSender = {
      fromUserId: recipientUser.userId!, // Trying to change sender - should fail
      message: "Updated message",
    };

    let error: any;
    await act(async () => {
      try {
        await updateThanksResult.current.update(createdThanks.id, updateDataWithSender);
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeDefined();
    expect(error.message).toBe("Cannot change the sender of thanks");
  });

  test("should fail to update thanks when trying to change receiver to sender", async () => {
    const { testUser } = authSetup;

    // Create thanks first
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

    expect(createdThanks).toBeDefined();
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Try to update thanks with receiver as sender
    const { result: updateThanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    const updateDataWithReceiverAsSender = {
      toUserId: testUser.userId!, // Trying to change receiver to sender - should fail
      message: "Updated message",
    };

    let error: any;
    await act(async () => {
      try {
        await updateThanksResult.current.update(
          createdThanks.id,
          updateDataWithReceiverAsSender,
        );
      } catch (e) {
        error = e;
      }
    });

    expect(error).toBeDefined();
    expect(error.message).toBe("Cannot change receiver to yourself");
  });
});
