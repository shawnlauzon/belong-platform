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
import { faker } from "@faker-js/faker";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useResources,
  useSignOut,
  BelongProvider,
  ResourceCategory,
} from "@belongnetwork/platform";
// Updated to use BelongProvider directly instead of TestWrapper
import { generateTestName } from "./database/utils/database-helpers";
import {
  createAndAuthenticateUser,
  type AuthSetupResult,
} from "./helpers/auth-helpers";
import {
  generateResourceData,
  cleanupTestResources,
  commonDeleteSuccessExpectation,
} from "./helpers/crud-test-patterns";

describe("Resources CRUD Integration Tests", () => {
  let authSetup: AuthSetupResult;
  let queryClient: QueryClient;
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

    // Set up authenticated user once for all tests
    authSetup = await createAndAuthenticateUser(wrapper);
  });

  beforeEach(async () => {
    // No expensive operations here - maintain real-world flow
  });

  afterEach(async () => {
    // Clean up only test data, not application state (like real world)
    await cleanupTestResources(
      wrapper,
      "resource",
      () => renderHook(() => useResources(), { wrapper }),
      () => renderHook(() => useResources(), { wrapper }),
      act,
      waitFor,
    );
  });

  afterAll(async () => {
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

  test("should successfully read resources without authentication", async () => {
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    // Wait for hook to initialize properly first
    await waitFor(() => {
      expect(resourcesResult.current).toBeDefined();
      expect(resourcesResult.current).not.toBeNull();
    }, { timeout: 5000 });

    // Then wait for data to load
    await waitFor(() => {
      expect(resourcesResult.current.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            title: expect.any(String),
            category: expect.any(String),
            type: expect.stringMatching(/^(offer|request)$/),
          }),
        ])
      );
      expect(resourcesResult.current.error).toBe(null);
    }, { timeout: 5000 });
  });

  test("should successfully create a resource when authenticated", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource
    const { result: createResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(createResourceResult.current).toBeDefined();
      expect(createResourceResult.current).not.toBeNull();
      expect(typeof createResourceResult.current.create).toBe('function');
    }, { timeout: 5000 });

    const resourceData = generateResourceData(testCommunity.id!);

    let createdResource: any;
    await act(async () => {
      createdResource = await createResourceResult.current.create(resourceData);
    });

    expect(createdResource).toMatchObject({
      id: expect.any(String),
      title: resourceData.title,
      description: resourceData.description,
      category: resourceData.category,
      type: resourceData.type,
      isActive: resourceData.isActive,
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Verify resource appears in resources list
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      expect(resourcesResult.current.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdResource.id,
            title: resourceData.title,
            category: resourceData.category,
            type: resourceData.type,
          }),
        ])
      );
      expect(resourcesResult.current.error).toBe(null);
    });
  });

  test("should successfully update a resource when authenticated as owner", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource first
    const { result: createResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    const resourceData = generateResourceData(testCommunity.id!);

    let createdResource: any;
    await act(async () => {
      createdResource = await createResourceResult.current.create(resourceData);
    });

    expect(createdResource).toMatchObject({
      id: expect.any(String),
    });
    expect(createdResource).toBeDefined();

    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the resource (skip community validation by using existing community from created resource)
    const { result: updateResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    const updatedTitle = generateTestName("RESOURCE");
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      title: updatedTitle,
      description: updatedDescription,
      category: ResourceCategory.TOOLS, // Change category
      type: resourceData.type,
      isActive: resourceData.isActive,
      imageUrls: resourceData.imageUrls,
    };

    let updatedResource: any;
    await act(async () => {
      updatedResource = await updateResourceResult.current.update(createdResource.id, updateData);
    });

    expect(updatedResource).toMatchObject({
      id: createdResource.id,
      title: updatedTitle,
      description: updatedDescription,
      category: ResourceCategory.TOOLS,
      type: resourceData.type,
      isActive: resourceData.isActive,
    });

    // Verify resource is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyUpdateResult.current.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdResource.id,
            title: updatedTitle,
            category: ResourceCategory.TOOLS,
          }),
        ])
      );
      expect(verifyUpdateResult.current.error).toBe(null);
    });
  });

  test("should successfully delete a resource when authenticated as owner", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource first
    const { result: createResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    const resourceData = generateResourceData(testCommunity.id!);

    let createdResource: any;
    await act(async () => {
      createdResource = await createResourceResult.current.create(resourceData);
    });

    expect(createdResource).toBeDefined();

    // Delete the resource
    const { result: deleteResourceResult } = renderHook(
      () => useResources(),
      {
        wrapper,
      },
    );

    await act(async () => {
      await deleteResourceResult.current.delete(createdResource.id);
    });

    // Delete operation should succeed without throwing
  });
});
