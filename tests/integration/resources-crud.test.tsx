import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useResources,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
  useSignOut,
  BelongProvider,
  ResourceCategory,
} from '@belongnetwork/platform';
// Updated to use BelongProvider directly instead of TestWrapper
import { generateTestName } from './database/utils/database-helpers';
import { 
  createAndAuthenticateUser,
  type AuthSetupResult
} from './helpers/auth-helpers';
import { 
  generateResourceData,
  cleanupTestResources,
  commonDeleteSuccessExpectation
} from './helpers/crud-test-patterns';

describe('Resources CRUD Integration Tests', () => {
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
    // Clean up all test resources using name-based cleanup
    await cleanupTestResources(
      wrapper,
      'resource',
      () => renderHook(() => useResources(), { wrapper }),
      () => renderHook(() => useDeleteResource(), { wrapper }),
      act,
      waitFor
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

  test('should successfully read resources without authentication', async () => {

    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      expect(resourcesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              title: expect.any(String),
              category: expect.any(String),
              type: expect.stringMatching(/^(offer|request)$/),
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully create a resource when authenticated', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = generateResourceData(testCommunity.id!);

    await act(async () => {
      await createResourceResult.current.mutateAsync(resourceData);
    });

    await waitFor(() => {
      expect(createResourceResult.current).toMatchObject({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
            title: resourceData.title,
            description: resourceData.description,
            category: resourceData.category,
            type: resourceData.type,
            isActive: resourceData.isActive,
          }),
          error: null,
        });
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Verify resource appears in resources list
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      expect(resourcesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createResourceResult.current.data!.id,
              title: resourceData.title,
              category: resourceData.category,
              type: resourceData.type,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully update a resource when authenticated as owner', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = generateResourceData(testCommunity.id!);

    await act(async () => {
      await createResourceResult.current.mutateAsync(resourceData);
    });

    await waitFor(() => {
      expect(createResourceResult.current).toMatchObject({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
          }),
          error: null,
        });
    });
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();

    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the resource (skip community validation by using existing community from created resource)
    const { result: updateResourceResult } = renderHook(() => useUpdateResource(), {
      wrapper,
    });

    const updatedTitle = generateTestName('RESOURCE');
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      id: createdResource!.id,
      title: updatedTitle,
      description: updatedDescription,
      category: ResourceCategory.TOOLS, // Change category
      type: resourceData.type,
      isActive: resourceData.isActive,
      imageUrls: resourceData.imageUrls,
    };

    await act(async () => {
      await updateResourceResult.current.mutateAsync(updateData);
    });

    await waitFor(() => {
      expect(updateResourceResult.current).toMatchObject({
          isSuccess: true,
          data: expect.objectContaining({
            id: createdResource!.id,
            title: updatedTitle,
            description: updatedDescription,
            category: ResourceCategory.TOOLS,
            type: resourceData.type,
            isActive: resourceData.isActive,
          }),
          error: null,
        });
    });

    // Verify resource is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyUpdateResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createdResource!.id,
              title: updatedTitle,
              category: ResourceCategory.TOOLS,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully delete a resource when authenticated as owner', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = generateResourceData(testCommunity.id!);

    await act(async () => {
      await createResourceResult.current.mutateAsync(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();

    // Delete the resource
    const { result: deleteResourceResult } = renderHook(() => useDeleteResource(), {
      wrapper,
    });

    await act(async () => {
      await deleteResourceResult.current.mutateAsync(createdResource!.id);
    });

    await waitFor(() => {
      expect(deleteResourceResult.current).toMatchObject(commonDeleteSuccessExpectation);
    });
  });
});
