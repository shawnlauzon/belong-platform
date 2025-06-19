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
  useThanks,
  useCreateThanks,
  useUpdateThanks,
  useDeleteThanks,
  useCreateResource,
  useDeleteResource,
  useSignUp,
  useSignIn,
  useSignOut,
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
  cleanupTestResources,
} from './helpers/crud-test-patterns';
import { faker } from '@faker-js/faker';

describe('Thanks Validation Integration Tests', () => {
  let authSetup: AuthSetupResult;
  let twoUsersSetup: TwoUserSetupResult;
  let queryClient: QueryClient;
  let testResource: any;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeAll(async () => {
    // Initialize Belong client
    initializeBelong({
      supabaseUrl: process.env.VITE_SUPABASE_URL!,
      supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY!,
      mapboxPublicToken: process.env.VITE_MAPBOX_PUBLIC_TOKEN!,
    });

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

    wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Set up users once for all tests
    twoUsersSetup = await setupTwoUsers(wrapper);
    authSetup = {
      testUser: twoUsersSetup.testUser,
      testCommunity: twoUsersSetup.testCommunity,
    };

    // The setupTwoUsers function signs up recipientUser last, leaving them authenticated
    // We need to sign in as testUser before creating the resource
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: twoUsersSetup.testUser.email,
        password: twoUsersSetup.testUser.password,
      });
    });

    await waitFor(() => {
      expect(signInResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
        }),
        error: null,
      });
    });

    // Now create a test resource while authenticated as first user (testUser)
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
    // Note: main test resource cleaned up in afterAll
  });

  afterAll(async () => {
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
        expect(deleteResourceResult.current.isSuccess).toBe(true)
      );
    }

    // Sign out to ensure clean state
    const { result: signOutResult } = renderHook(() => useSignOut(), {
      wrapper,
    });

    await act(async () => {
      signOutResult.current.mutate();
    });

    await waitFor(() => expect(signOutResult.current.isSuccess).toBe(true));

    resetBelongClient();
  });

  beforeEach(async () => {
    // Reset for each test - no expensive operations here
  });

  afterEach(async () => {
    // Clean up all test thanks using name-based cleanup
    await cleanupTestResources(
      wrapper,
      'thanks',
      () => renderHook(() => useThanks(), { wrapper }),
      () => renderHook(() => useDeleteThanks(), { wrapper }),
      act,
      waitFor
    );
  });

  test('should fail to create thanks when user tries to thank themselves', async () => {
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
      expect(createThanksResult.current.isError || createThanksResult.current.isSuccess).toBe(true);
    });

    expect(createThanksResult.current).toMatchObject({
      isError: true,
      error: expect.objectContaining({
        message: 'Cannot thank yourself',
      }),
    });
  });

  test('should fail to update thanks when trying to change sender', async () => {
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
    // Note: cleanup handled automatically by name-based cleanup in afterEach

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
      expect(updateThanksResult.current.isError || updateThanksResult.current.isSuccess).toBe(true);
    });

    expect(updateThanksResult.current).toMatchObject({
      isError: true,
      error: expect.objectContaining({
        message: 'Cannot change the sender of thanks',
      }),
    });
  });

  test('should fail to update thanks when trying to change receiver to sender', async () => {
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
    // Note: cleanup handled automatically by name-based cleanup in afterEach

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
      expect(updateThanksResult.current.isError || updateThanksResult.current.isSuccess).toBe(true);
    });

    expect(updateThanksResult.current).toMatchObject({
      isError: true,
      error: expect.objectContaining({
        message: 'Cannot change receiver to yourself',
      }),
    });
  });
});
