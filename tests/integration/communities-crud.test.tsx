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
  useAuth,
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
      "community",
      () => renderHook(() => useCommunities(), { wrapper }),
      act,
      waitFor,
    );
  });

  afterAll(async () => {
    // Sign out to ensure clean state
    const { result: authResult } = renderHook(() => useAuth(), {
      wrapper,
    });

    // Wait for hook initialization
    await waitFor(() => {
      expect(authResult.current).toBeDefined();
      expect(authResult.current.signOut).toBeDefined();
    }, { timeout: 5000 });

    // Sign out if authenticated
    if (authResult.current.isAuthenticated) {
      await act(async () => {
        await authResult.current.signOut();
      });
    }

    // Clear query cache
    queryClient.clear();
  });

  test("should successfully read communities without authentication", async () => {
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    // Wait for hook to initialize
    await waitFor(() => {
      // Check that hook is properly initialized
      expect(communitiesResult.current).toBeDefined();
      expect(communitiesResult.current).not.toBeNull();
      expect(typeof communitiesResult.current.list).toBe('function');
    }, { timeout: 5000 });
    
    // Fetch communities using new API
    const communities = await communitiesResult.current.list();
    expect(Array.isArray(communities)).toBe(true);
    
    // Log what we found
    console.log("Communities found:", communities?.length || 0);
    
    // Verify the shape of communities if any exist
    if (communities && communities.length > 0) {
      const firstCommunity = communities[0];
      expect(firstCommunity).toHaveProperty('id');
      expect(firstCommunity).toHaveProperty('name');
      expect(firstCommunity).toHaveProperty('level');
      expect(firstCommunity).toHaveProperty('timeZone');
    }
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

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(communitiesHook.current).toBeDefined();
      expect(communitiesHook.current).not.toBeNull();
      expect(typeof communitiesHook.current.create).toBe('function');
    }, { timeout: 5000 });

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
      expect(typeof communitiesListResult.current.list).toBe('function');
    });

    const communitiesList = await communitiesListResult.current.list();
    expect(communitiesList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdCommunity.id,
          name: communityData.name,
          level: communityData.level,
        }),
      ])
    );
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

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(communitiesResult.current).toBeDefined();
      expect(communitiesResult.current).not.toBeNull();
      expect(typeof communitiesResult.current.create).toBe('function');
    }, { timeout: 5000 });

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
      expect(typeof verifyUpdateResult.current.list).toBe('function');
    });

    const updatedCommunitiesList = await verifyUpdateResult.current.list();
    expect(updatedCommunitiesList).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdCommunity.id,
          name: updatedName,
        }),
      ])
    );
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

    // Wait for hook to initialize properly
    await waitFor(() => {
      expect(communitiesResult.current).toBeDefined();
      expect(communitiesResult.current).not.toBeNull();
      expect(typeof communitiesResult.current.create).toBe('function');
    }, { timeout: 5000 });

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
      expect(typeof verifyDeleteResult.current.list).toBe('function');
    });

    const deletedCommunitiesList = await verifyDeleteResult.current.list();
    expect(deletedCommunitiesList).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: createdCommunity.id,
        }),
      ])
    );
  });
});
