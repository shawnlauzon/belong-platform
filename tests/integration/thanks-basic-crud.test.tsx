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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useThanks,
  useCreateThanks,
  useUpdateThanks,
  useDeleteThanks,
  useCreateResource,
  useDeleteResource,
  useSignIn,
  useSignOut,
  BelongProvider,
  ResourceCategory,
} from '@belongnetwork/platform';
// Updated to use BelongProvider directly instead of TestWrapper
import { generateTestName } from './database/utils/database-helpers';
import {
  createAndAuthenticateUser,
  createAdditionalUser,
  type AuthSetupResult,
  type TestUser,
} from './helpers/auth-helpers';
import {
  generateResourceData,
  generateThanksData,
  cleanupTestResources,
  commonDeleteSuccessExpectation,
} from './helpers/crud-test-patterns';

describe('Thanks Basic CRUD Integration Tests', () => {
  let authSetup: AuthSetupResult;
  let recipientUser: TestUser;
  let queryClient: QueryClient;
  let testResource: any;
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

    // Set up authenticated user once for all tests - this user will create all test items
    authSetup = await createAndAuthenticateUser(wrapper);

    // Create a second user for recipient scenarios (but don't leave them authenticated)
    recipientUser = await createAdditionalUser(wrapper, authSetup.testUser);

    // Now create a test resource while authenticated as first user (testUser)
    const { result: createResourceResult } = renderHook(
      () => useCreateResource(),
      {
        wrapper,
      }
    );

    const resourceData = generateResourceData(authSetup.testCommunity.id!);

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
    // Clean up the test resource and any remaining thanks
    // Sign in as the original user for cleanup (the user who created the resource)
    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: authSetup.testUser.email,
        password: authSetup.testUser.password,
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

    // No cleanup needed with provider pattern
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

  test('should successfully read thanks without authentication', async () => {
    const { result: thanksResult } = renderHook(() => useThanks(), {
      wrapper,
    });

    await waitFor(() => expect(thanksResult.current.isSuccess).toBe(true));

    expect(thanksResult.current.data).toEqual(expect.any(Array));
  });

  test('should successfully create thanks when authenticated', async () => {
    const { testUser } = authSetup;

    // Create thanks using the pre-created resource
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

    // Note: cleanup handled automatically by name-based cleanup in afterEach
  });

  test('should successfully update thanks when authenticated as sender', async () => {
    const { testUser } = authSetup;

    // Create thanks first using the pre-created resource
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
    // Note: cleanup handled automatically by name-based cleanup in afterEach

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

    // Note: Update verification not needed as mutation already validates response
  });

  test('should successfully delete thanks when authenticated as sender', async () => {
    const { testUser } = authSetup;

    // Create thanks first using the pre-created resource
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
      expect(deleteThanksResult.current).toMatchObject(
        commonDeleteSuccessExpectation
      );
    });

    // Note: Delete verification not needed as mutation already validates response
  });
});
