import { describe, test, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useSignOut,
  resetBelongClient,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { 
  setupAuthenticatedUser,
  type AuthSetupResult
} from './helpers/auth-helpers';
import { 
  generateEventData,
  cleanupTestResources,
  commonDeleteSuccessExpectation
} from './helpers/crud-test-patterns';

describe('Events Basic CRUD Integration Tests', () => {
  let authSetup: AuthSetupResult;
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: React.ReactNode }) => JSX.Element;

  beforeAll(async () => {
    // Initialize Belong client once for all tests
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

    // Set up authenticated user once for all tests
    authSetup = await setupAuthenticatedUser(wrapper);
  });

  beforeEach(async () => {
    // Reset for each test - no expensive operations here
  });

  afterEach(async () => {
    // Clean up all test events using name-based cleanup
    await cleanupTestResources(
      wrapper,
      'event',
      () => renderHook(() => useEvents(), { wrapper }),
      () => renderHook(() => useDeleteEvent(), { wrapper }),
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
      signOutResult.current.mutate();
    });

    await waitFor(() => expect(signOutResult.current.isSuccess).toBe(true));

    resetBelongClient();
  });

  test('should successfully read events without authentication', async () => {

    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(eventsResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.any(Array),
          error: null,
        })
      );
    });
  });

  test('should successfully create an event when authenticated', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const eventData = generateEventData(testCommunity.id!, testUser.userId!);

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => {
      expect(createEventResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          isActive: eventData.isActive,
        }),
        error: null,
      });
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Verify event appears in events list
    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(eventsResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createEventResult.current.data!.id,
              title: eventData.title,
              location: eventData.location,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully update an event when authenticated as organizer', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event first
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const eventData = {
      ...generateEventData(testCommunity.id!, testUser.userId!),
      title: 'Test Event to Update',
    };

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => {
      expect(createEventResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: expect.any(String),
        }),
        error: null,
      });
    });
    const createdEvent = createEventResult.current.data!;
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the event
    const { result: updateEventResult } = renderHook(() => useUpdateEvent(), {
      wrapper,
    });

    const updatedTitle = 'Updated Event Title';
    const updatedDescription = 'Updated event description';
    const updateData = {
      id: createdEvent.id,
      title: updatedTitle,
      description: updatedDescription,
    };

    await act(async () => {
      updateEventResult.current.mutate(updateData);
    });

    await waitFor(() => {
      expect(updateEventResult.current).toMatchObject({
        isSuccess: true,
        data: expect.objectContaining({
          id: createdEvent.id,
          title: updatedTitle,
          description: updatedDescription,
          location: eventData.location,
          isActive: eventData.isActive,
        }),
        error: null,
      });
    });

    // Verify event is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyUpdateResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createdEvent.id,
              title: updatedTitle,
            })
          ]),
          error: null,
        })
      );
    });
  });

  test('should successfully delete an event when authenticated as organizer', async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event first
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const eventData = {
      ...generateEventData(testCommunity.id!, testUser.userId!),
      title: 'Test Event to Delete',
    };

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => expect(createEventResult.current.isSuccess).toBe(true));
    const createdEvent = createEventResult.current.data!;

    // Delete the event
    const { result: deleteEventResult } = renderHook(() => useDeleteEvent(), {
      wrapper,
    });

    await act(async () => {
      deleteEventResult.current.mutate(createdEvent.id);
    });

    await waitFor(() => {
      expect(deleteEventResult.current).toMatchObject(commonDeleteSuccessExpectation);
    });

    // Verify event is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyDeleteResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.not.arrayContaining([
            expect.objectContaining({
              id: createdEvent.id,
            })
          ]),
          error: null,
        })
      );
    });
  });
});