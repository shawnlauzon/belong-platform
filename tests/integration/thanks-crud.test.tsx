import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useThanks,
  useCreateThanks,
  useUpdateThanks,
  useDeleteThanks,
  useSignIn,
  useSignUp,
  useResources,
  useCreateResource,
  useDeleteResource,
  useCommunities,
  resetBelongClient,
  ResourceCategory,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';

describe('Thanks CRUD Integration Tests', () => {
  let testUser: { email: string; password: string; userId?: string };
  let testCommunity: { id?: string; name: string };
  let testResource: { id?: string; title: string };
  let createdThanksIds: string[] = [];
  let createdResourceIds: string[] = [];
  let queryClient: QueryClient;

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

    // Initialize Belong client
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

    // Generate unique test user
    testUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };

    // Generate unique test community
    testCommunity = {
      name: generateTestName('Test Community'),
    };

    // Generate unique test resource
    testResource = {
      title: generateTestName('Test Resource'),
    };

    createdThanksIds = [];
    createdResourceIds = [];
  });

  afterEach(async () => {
    // Clean up created thanks
    if (createdThanksIds.length > 0) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      );

      const { result: deleteResult } = renderHook(() => useDeleteThanks(), {
        wrapper,
      });

      for (const thanksId of createdThanksIds) {
        await act(async () => {
          deleteResult.current.mutate(thanksId);
        });
        
        await waitFor(() => expect(deleteResult.current.isSuccess).toBe(true));
      }
    }

    // Clean up created resources
    if (createdResourceIds.length > 0) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      );

      const { result: deleteResourceResult } = renderHook(() => useDeleteResource(), {
        wrapper,
      });

      for (const resourceId of createdResourceIds) {
        await act(async () => {
          deleteResourceResult.current.mutate(resourceId);
        });
        
        await waitFor(() => expect(deleteResourceResult.current.isSuccess).toBe(true));
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

    // Get existing communities to use for testing
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => expect(communitiesResult.current.isSuccess).toBe(true));
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

    // Sign up test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));
    testUser.userId = signUpResult.current.data?.id;

    // Sign in test user
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Create a resource first (needed for thanks)
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: testResource.title,
      description: faker.lorem.paragraph(),
      category: ResourceCategory.FOOD,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    testResource.id = createResourceResult.current.data!.id;
    createdResourceIds.push(testResource.id);

    // Get existing resources to find another user's resource for thanks
    const { result: resourcesResult } = renderHook(() => useResources(), {
      wrapper,
    });

    await waitFor(() => expect(resourcesResult.current.isSuccess).toBe(true));
    
    // Find a resource that's not created by the current user (for realistic thanks scenario)
    const otherResource = resourcesResult.current.data?.find(
      resource => resource.owner.id !== testUser.userId
    );

    // If no other user's resource exists, we'll create thanks for our own resource (less realistic but functional)
    const targetResource = otherResource || createResourceResult.current.data!;
    const targetUserId = otherResource?.owner.id || testUser.userId!;

    // Create thanks
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = {
      fromUserId: testUser.userId!,
      toUserId: targetUserId,
      resourceId: targetResource.id,
      message: faker.lorem.sentence(),
      impactDescription: faker.lorem.paragraph(),
      imageUrls: [],
    };

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
        })
      );
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

    // Get existing communities and resources
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => expect(communitiesResult.current.isSuccess).toBe(true));
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

    // Sign up and sign in test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));
    testUser.userId = signUpResult.current.data?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: generateTestName('Test Resource for Thanks Update'),
      description: faker.lorem.paragraph(),
      category: ResourceCategory.TOOLS,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();
    createdResourceIds.push(createdResource!.id);

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = {
      fromUserId: testUser.userId!,
      toUserId: testUser.userId!, // Self-thanks for test simplicity
      resourceId: createdResource!.id,
      message: faker.lorem.sentence(),
      impactDescription: faker.lorem.paragraph(),
      imageUrls: [],
    };

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
        })
      );
    });
    });
    const createdThanks = createThanksResult.current.data;
    expect(createdThanks).toBeDefined();

    // Track for cleanup
    createdThanksIds.push(createdThanks!.id);

    // Update the thanks
    const { result: updateThanksResult } = renderHook(() => useUpdateThanks(), {
      wrapper,
    });

    const updatedMessage = faker.lorem.sentence();
    const updatedImpactDescription = faker.lorem.paragraph();
    const updateData = {
      id: createdThanks!.id,
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
            id: createdThanks!.id,
            message: updatedMessage,
            impactDescription: updatedImpactDescription,
          }),
          error: null,
        })
      );
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
          id: createdThanks!.id,
          message: updatedMessage,
        })
      ])
    );
  });

  test('should successfully delete thanks when authenticated as sender', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Get existing communities
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => expect(communitiesResult.current.isSuccess).toBe(true));
    const existingCommunity = communitiesResult.current.data?.[0];
    expect(existingCommunity).toBeDefined();
    testCommunity.id = existingCommunity!.id;

    // Sign up and sign in test user
    const { result: signUpResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signUpResult.current.isSuccess).toBe(true));
    testUser.userId = signUpResult.current.data?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      title: generateTestName('Test Resource for Thanks Delete'),
      description: faker.lorem.paragraph(),
      category: ResourceCategory.SUPPLIES,
      type: 'offer' as const,
      communityId: testCommunity.id!,
      isActive: true,
      imageUrls: [],
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data;
    expect(createdResource).toBeDefined();
    createdResourceIds.push(createdResource!.id);

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = {
      fromUserId: testUser.userId!,
      toUserId: testUser.userId!, // Self-thanks for test simplicity
      resourceId: createdResource!.id,
      message: faker.lorem.sentence(),
      impactDescription: faker.lorem.paragraph(),
      imageUrls: [],
    };

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
        })
      );
    });
    });
    const createdThanks = createThanksResult.current.data;
    expect(createdThanks).toBeDefined();

    // Delete the thanks
    const { result: deleteThanksResult } = renderHook(() => useDeleteThanks(), {
      wrapper,
    });

    await act(async () => {
      deleteThanksResult.current.mutate(createdThanks!.id);
    });

    await waitFor(() => {
      expect(deleteThanksResult.current).toMatchObject({
          isSuccess: true,
          error: null,
        })
      );
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
          id: createdThanks!.id,
        })
      ])
    );
  });
});