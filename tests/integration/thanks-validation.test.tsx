import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from 'vitest';
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
  useSignIn,
  resetBelongClient,
  ResourceCategory,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';
import {
  setupAuthenticatedUser,
  setupTwoUsers,
  type AuthSetupResult,
  type TwoUserSetupResult,
} from './helpers/auth-helpers';
import {
  generateResourceData,
  generateThanksData,
  performCleanupDeletion,
} from './helpers/crud-test-patterns';
import { faker } from '@faker-js/faker';

describe('Thanks Validation Integration Tests', () => {
  let authSetup: AuthSetupResult;
  let twoUsersSetup: TwoUserSetupResult;
  let createdThanksIds: string[] = [];
  let createdResourceIds: string[] = [];
  let queryClient: QueryClient;
  let testResource: any;

  beforeAll(async () => {
    // Initialize Belong client
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

    // Create query client for setup
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

    // Set up users once for all tests
    twoUsersSetup = await setupTwoUsers(wrapper);
    authSetup = {
      testUser: twoUsersSetup.testUser,
      testCommunity: twoUsersSetup.testCommunity,
    };

    // Create a test resource while authenticated as first user
    const { result: createResourceResult } = renderHook(
      () => useCreateResource(),
      {
        wrapper,
      }
    );

    const resourceData = generateResourceData(twoUsersSetup.testCommunity.id!);

    await act(async () => {
      createResourceResult.current.mutate(resourceData);
    });

    await waitFor(() =>
      expect(createResourceResult.current.isSuccess).toBe(true)
    );
    testResource = createResourceResult.current.data!;
    createdResourceIds.push(testResource.id);

    // Sign back in as the original user after setup
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: twoUsersSetup.testUser.email,
        password: twoUsersSetup.testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));
  });

  afterAll(async () => {
    // Clean up the test resource
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

    // Sign in as the original user for cleanup
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: twoUsersSetup.testUser.email,
        password: twoUsersSetup.testUser.password,
      });
    });

    await waitFor(() => expect(signInResult.current.isSuccess).toBe(true));

    // Clean up test resource
    if (testResource) {
      const { result: deleteResourceResult } = renderHook(
        () => useDeleteResource(),
        {
          wrapper,
        }
      );

      await act(async () => {
        deleteResourceResult.current.mutate(testResource.id);
      });

      await waitFor(() =>
        expect(deleteResourceResult.current.isPending).toBe(false)
      );
      expect(deleteResourceResult.current).toMatchObject({
        isSuccess: true,
        error: null,
      });
    }

    resetBelongClient();
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

    // Clean up created resources (excluding the main test resource which is cleaned in afterAll)
    const resourcesToClean = createdResourceIds.filter(
      (id) => id !== testResource?.id
    );
    if (resourcesToClean.length > 0) {
      const { result: deleteResourceResult } = renderHook(
        () => useDeleteResource(),
        {
          wrapper,
        }
      );

      for (const resourceId of resourcesToClean) {
        await performCleanupDeletion(
          deleteResourceResult,
          resourceId,
          act,
          waitFor
        );
      }
    }
  });

  test('should fail to create thanks when user tries to thank themselves', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity } = authSetup;

    // Try to create thanks with same user as sender and receiver using shared resource
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
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

    const { testUser, testCommunity, recipientUser } = twoUsersSetup;

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

    await waitFor(() =>
      expect(signUpAnotherResult.current.isSuccess).toBe(true)
    );
    const anotherUserId = signUpAnotherResult.current.data?.id;

    // Sign back in as the original user after creating the third user
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

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!,
      recipientUser.userId!,
      testResource.id
    );

    await act(async () => {
      createThanksResult.current.mutate(thanksData);
    });

    await waitFor(() =>
      expect(createThanksResult.current.isSuccess).toBe(true)
    );
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

    const { testUser, testCommunity, recipientUser } = twoUsersSetup;

    // Create thanks first
    const { result: createThanksResult } = renderHook(() => useCreateThanks(), {
      wrapper,
    });

    const thanksData = generateThanksData(
      testUser.userId!,
      recipientUser.userId!,
      testResource.id
    );

    await act(async () => {
      createThanksResult.current.mutate(thanksData);
    });

    await waitFor(() =>
      expect(createThanksResult.current.isSuccess).toBe(true)
    );
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
