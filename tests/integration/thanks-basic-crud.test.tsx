import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useThanks,
  useCreateThanks,
  useUpdateThanks,
  useDeleteThanks,
  useCreateResource,
  useDeleteResource,
  resetBelongClient,
  ResourceCategory,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';
import { 
  setupTwoUsers
} from './helpers/auth-helpers';
import { 
  generateResourceData, 
  generateThanksData,
  performCleanupDeletion
} from './helpers/crud-test-patterns';

describe('Thanks Basic CRUD Integration Tests', () => {
  let testUser: { email: string; password: string; userId?: string };
  let recipientUser: { email: string; password: string; userId?: string };
  let testCommunity: { id?: string; name: string };
  let createdThanksIds: string[] = [];
  let createdResourceIds: string[] = [];
  let queryClient: QueryClient;

  beforeAll(async () => {
    // Initialize Belong client
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

    // Create query client for auth setup
    const setupQueryClient = new QueryClient({
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

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={setupQueryClient}>{children}</TestWrapper>
    );

    // Set up two users once for all tests
    const twoUsersSetup = await setupTwoUsers(wrapper);
    testUser = twoUsersSetup.testUser;
    recipientUser = twoUsersSetup.recipientUser;
    testCommunity = twoUsersSetup.testCommunity;
  });

  beforeEach(async () => {
    // Create fresh query client for each test
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

    createdThanksIds = [];
    createdResourceIds = [];
  });

  afterEach(async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Clean up created thanks
    if (createdThanksIds.length > 0) {
      const { result: deleteResult } = renderHook(() => useDeleteThanks(), {
        wrapper,
      });

      for (const thanksId of createdThanksIds) {
        await performCleanupDeletion(deleteResult, thanksId, act, waitFor);
      }
    }

    // Clean up created resources
    if (createdResourceIds.length > 0) {
      const { result: deleteResourceResult } = renderHook(() => useDeleteResource(), {
        wrapper,
      });

      for (const resourceId of createdResourceIds) {
        await performCleanupDeletion(deleteResourceResult, resourceId, act, waitFor);
      }
    }

    resetBelongClient();
  });

  test('should successfully read thanks without authentication', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { result: thanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await waitFor(() => expect(thanksResult.current.isSuccess).toBe(true));
    
    expect(thanksResult.current.data).toEqual(
      expect.any(Array)
    );
  });

  test('should successfully create thanks when authenticated', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Use the authenticated users from beforeAll

    // Create a resource first (needed for thanks)
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = generateResourceData(testCommunity.id!);

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data!;
    createdResourceIds.push(createdResource.id);

    // Create thanks
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!, 
      recipientUser.userId!, 
      createdResource.id
    );

    await act(async () => {
      createThanksResult.current.mutate(thanksData);
    });

    await waitFor(() => {
      expect(createThanksResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
          message: thanksData.message,
          impactDescription: thanksData.impactDescription,
        }),
        error: null,
      });
    });
    
    // Track for cleanup
    createdThanksIds.push(createThanksResult.current.data!.id);

    // Verify thanks appears in thanks list
    const { result: thanksListResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await waitFor(() => expect(thanksListResult.current.isSuccess).toBe(true));
    
    expect(thanksListResult.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createThanksResult.current.data!.id,
          message: thanksData.message,
        })
      ])
    );
  });

  test('should successfully update thanks when authenticated as sender', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Use the authenticated users from beforeAll

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      ...generateResourceData(testCommunity.id!),
      title: generateTestName('Test Resource for Thanks Update'),
      category: ResourceCategory.TOOLS,
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data!;
    createdResourceIds.push(createdResource.id);

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!, 
      recipientUser.userId!, 
      createdResource.id
    );

    await act(async () => {
      createThanksResult.current.mutate(thanksData);
    });

    await waitFor(() => {
      expect(createThanksResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
          message: thanksData.message,
        }),
        error: null,
      });
    });
    const createdThanks = createThanksResult.current.data!;
    createdThanksIds.push(createdThanks.id);

    // Update the thanks
    const { result: updateThanksResult } = renderHook(() => useUpdateThanks(), {
      wrapper,
    });

    const updatedMessage = 'Updated thanks message';
    const updatedImpactDescription = 'Updated impact description';
    const updateData = {
      id: createdThanks.id,
      message: updatedMessage,
      impactDescription: updatedImpactDescription,
      fromUserId: thanksData.fromUserId,
      toUserId: thanksData.toUserId,
      resourceId: thanksData.resourceId,
      imageUrls: thanksData.imageUrls,
    };

    await act(async () => {
      updateThanksResult.current.mutate(updateData);
    });

    await waitFor(() => {
      expect(updateThanksResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: createdThanks.id,
          message: updatedMessage,
          impactDescription: updatedImpactDescription,
        }),
        error: null,
      });
    });

    // Verify thanks is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await waitFor(() => expect(verifyUpdateResult.current.isSuccess).toBe(true));
    
    expect(verifyUpdateResult.current.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdThanks.id,
          message: updatedMessage,
        })
      ])
    );
  });

  test('should successfully delete thanks when authenticated as sender', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Use the authenticated users from beforeAll

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      ...generateResourceData(testCommunity.id!),
      title: generateTestName('Test Resource for Thanks Delete'),
      category: ResourceCategory.SUPPLIES,
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data!;
    createdResourceIds.push(createdResource.id);

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!, 
      recipientUser.userId!, 
      createdResource.id
    );

    await act(async () => {
      createThanksResult.current.mutate(thanksData);
    });

    await waitFor(() => {
      expect(createThanksResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
          message: thanksData.message,
        }),
        error: null,
      });
    });
    const createdThanks = createThanksResult.current.data!;

    // Delete the thanks
    const { result: deleteThanksResult } = renderHook(() => useDeleteThanks(), {
      wrapper,
    });

    await act(async () => {
      deleteThanksResult.current.mutate(createdThanks.id);
    });

    await waitFor(() => {
      expect(deleteThanksResult.current).toMatchObject({
        isSuccess: true,
        error: null,
      });
    });

    // Verify thanks is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await waitFor(() => expect(verifyDeleteResult.current.isSuccess).toBe(true));
    
    expect(verifyDeleteResult.current.data).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: createdThanks.id,
        })
      ])
    );
  });
});