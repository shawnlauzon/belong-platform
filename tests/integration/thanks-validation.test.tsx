import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useCreateThanks,
  useUpdateThanks,
  useCreateResource,
  useDeleteResource,
  useSignUp,
  resetBelongClient,
  ResourceCategory,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';
import { 
  setupAuthenticatedUser, 
  setupTwoUsers,
  type AuthSetupResult,
  type TwoUserSetupResult 
} from './helpers/auth-helpers';
import { 
  generateResourceData, 
  generateThanksData,
  performCleanupDeletion
} from './helpers/crud-test-patterns';
import { faker } from '@faker-js/faker';

describe('Thanks Validation Integration Tests', () => {
  let authSetup: AuthSetupResult;
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

    createdThanksIds = [];
    createdResourceIds = [];
  });

  afterEach(async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

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

  test('should fail to create thanks when user tries to thank themselves', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity }: AuthSetupResult = await setupAuthenticatedUser(wrapper);

    // Create a resource first
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      ...generateResourceData(testCommunity.id!),
      title: generateTestName('Test Resource for Self Thanks'),
      category: ResourceCategory.SUPPLIES,
    };

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() => expect(createResourceResult.current.isSuccess).toBe(true));
    const createdResource = createResourceResult.current.data!;
    createdResourceIds.push(createdResource.id);

    // Try to create thanks with same user as sender and receiver
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const selfThanksData = {
      fromUserId: testUser.userId!,
      toUserId: testUser.userId!, // Same as sender - should fail
      resourceId: createdResource.id,
      message: faker.lorem.sentence(),
      impactDescription: faker.lorem.paragraph(),
      imageUrls: [],
    };

    await act(async () => {
      createThanksResult.current.mutate(selfThanksData);
    });

    await waitFor(() => {
      expect(createThanksResult.current).toMatchObject({
        isError: true,
        error: expect.objectContaining({
          message: 'Cannot thank yourself',
        }),
      });
    });
  });

  test('should fail to update thanks when trying to change sender', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity, recipientUser }: TwoUserSetupResult = await setupTwoUsers(wrapper);

    // Create a third user (another user)
    const anotherUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };

    const { result: signUpAnotherResult } = renderHook(() => useSignUp(), {
      wrapper,
    });

    await act(async () => {
      signUpAnotherResult.current.mutate({
        email: anotherUser.email,
        password: anotherUser.password,
      });
    });

    await waitFor(() => expect(signUpAnotherResult.current.isSuccess).toBe(true));
    const anotherUserId = signUpAnotherResult.current.data?.id;

    // Create a resource
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      ...generateResourceData(testCommunity.id!),
      title: generateTestName('Test Resource for Update Thanks'),
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

    await waitFor(() => expect(createThanksResult.current.isSuccess).toBe(true));
    const createdThanks = createThanksResult.current.data!;
    createdThanksIds.push(createdThanks.id);

    // Try to update thanks with different sender
    const { result: updateThanksResult } = renderHook(() => useUpdateThanks(), {
      wrapper,
    });

    const updateDataWithSender = {
      id: createdThanks.id,
      fromUserId: anotherUserId!, // Trying to change sender - should fail
      message: 'Updated message',
    };

    await act(async () => {
      updateThanksResult.current.mutate(updateDataWithSender);
    });

    await waitFor(() => {
      expect(updateThanksResult.current).toMatchObject({
        isError: true,
        error: expect.objectContaining({
          message: 'Cannot change the sender of thanks',
        }),
      });
    });
  });

  test('should fail to update thanks when trying to change receiver to sender', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity, recipientUser }: TwoUserSetupResult = await setupTwoUsers(wrapper);

    // Create a resource
    const { result: createResourceResult } = renderHook(() => useCreateResource(), {
      wrapper,
    });

    const resourceData = {
      ...generateResourceData(testCommunity.id!),
      title: generateTestName('Test Resource for Receiver Update'),
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

    await waitFor(() => expect(createThanksResult.current.isSuccess).toBe(true));
    const createdThanks = createThanksResult.current.data!;
    createdThanksIds.push(createdThanks.id);

    // Try to update thanks with receiver as sender
    const { result: updateThanksResult } = renderHook(() => useUpdateThanks(), {
      wrapper,
    });

    const updateDataWithReceiverAsSender = {
      id: createdThanks.id,
      toUserId: testUser.userId!, // Trying to change receiver to sender - should fail
      message: 'Updated message',
    };

    await act(async () => {
      updateThanksResult.current.mutate(updateDataWithReceiverAsSender);
    });

    await waitFor(() => {
      expect(updateThanksResult.current).toMatchObject({
        isError: true,
        error: expect.objectContaining({
          message: 'Cannot change receiver to yourself',
        }),
      });
    });
  });
});