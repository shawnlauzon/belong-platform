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
  useCommunities,
  useSignOut,
  BelongProvider,
} from "@belongnetwork/platform";
// Updated to use BelongProvider directly instead of TestWrapper
import { generateTestName } from "./database/utils/database-helpers";
import {
  createAndAuthenticateUser,
  type AuthSetupResult,
} from "./helpers/auth-helpers";
import {
  cleanupTestResources,
  commonDeleteSuccessExpectation,
} from "./helpers/crud-test-patterns";

describe("Communities CRUD Integration Tests", () => {
  let authSetup: AuthSetupResult;
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeAll(async () => {
    // Create query client once for all tests
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
    // Reset for each test - no expensive operations here
  });

  afterEach(async () => {
    // Clean up all test communities using name-based cleanup
    await cleanupTestResources(
      wrapper,
      "community",
      () => renderHook(() => useCommunities(), { wrapper }),
      () => renderHook(() => useCommunities(), { wrapper }),
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

  test("should successfully read communities without authentication", async () => {
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      expect(communitiesResult.current.communities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            level: expect.any(String),
            timeZone: expect.any(String),
          }),
        ]),
      );
      expect(communitiesResult.current.error).toBe(null);
    });
  });

  test("should successfully create a community when authenticated", async () => {
    const { testUser }: AuthSetupResult = authSetup;

    // Create a community using consolidated hook
    const { result: communitiesHook } = renderHook(
      () => useCommunities(),
      {
        wrapper,
      },
    );

    // Wait for hook to be ready
    await waitFor(() => {
      expect(communitiesHook.current).not.toBeNull();
    });

    const communityData = {
      name: generateTestName("COMMUNITY"),
      description: faker.lorem.paragraph(),
      level: "neighborhood" as const,
      timeZone: "America/New_York",
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: "test", name: "Test" }],
      memberCount: 1,
    };

    let createdCommunity: any;
    await act(async () => {
      createdCommunity = await communitiesHook.current.create(communityData);
    });

    // Verify creation was successful
    expect(createdCommunity).toMatchObject({
      id: expect.any(String),
      name: communityData.name,
      description: communityData.description,
      level: communityData.level,
      timeZone: communityData.timeZone,
      organizer: expect.objectContaining({
        id: testUser.userId,
      }),
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Verify community appears in communities list
    const { result: communitiesListResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      expect(communitiesListResult.current.communities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdCommunity.id,
            name: communityData.name,
            level: communityData.level,
          }),
        ]),
      );
    });
  });

  test("should successfully update a community when authenticated as organizer", async () => {
    const { testUser }: AuthSetupResult = authSetup;

    // Create a community first using consolidated hook
    const { result: communitiesResult } = renderHook(
      () => useCommunities(),
      {
        wrapper,
      },
    );

    const communityData = {
      name: generateTestName("COMMUNITY"),
      description: faker.lorem.paragraph(),
      level: "neighborhood" as const,
      timeZone: "America/New_York",
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: "test", name: "Test" }],
      memberCount: 1,
    };

    let createdCommunity: any;
    await act(async () => {
      createdCommunity = await communitiesResult.current.create(communityData);
    });

    expect(createdCommunity).toBeDefined();

    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the community
    const updatedName = generateTestName("COMMUNITY");
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      name: updatedName,
      description: updatedDescription,
      level: communityData.level,
      timeZone: communityData.timeZone,
      hierarchyPath: communityData.hierarchyPath,
    };

    let updatedCommunity: any;
    await act(async () => {
      updatedCommunity = await communitiesResult.current.update(createdCommunity.id, updateData);
    });

    expect(updatedCommunity).toMatchObject({
      id: createdCommunity.id,
      name: updatedName,
      description: updatedDescription,
      level: communityData.level,
      timeZone: communityData.timeZone,
    });

    // Verify community is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyUpdateResult.current.communities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdCommunity.id,
            name: updatedName,
          }),
        ]),
      );
    });
  });

  test("should successfully delete a community when authenticated as organizer", async () => {
    const { testUser }: AuthSetupResult = authSetup;

    // Create a community first using consolidated hook
    const { result: communitiesResult } = renderHook(
      () => useCommunities(),
      {
        wrapper,
      },
    );

    const communityData = {
      name: generateTestName("COMMUNITY"),
      description: faker.lorem.paragraph(),
      level: "neighborhood" as const,
      timeZone: "America/New_York",
      organizerId: testUser.userId!,
      parentId: null,
      hierarchyPath: [{ level: "test", name: "Test" }],
      memberCount: 1,
    };

    let createdCommunity: any;
    await act(async () => {
      createdCommunity = await communitiesResult.current.create(communityData);
    });

    expect(createdCommunity).toBeDefined();

    // Delete the community
    await act(async () => {
      await communitiesResult.current.delete(createdCommunity.id);
    });

    // Verify community is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyDeleteResult.current.communities).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            id: createdCommunity.id,
          }),
        ]),
      );
    });
  });
});
