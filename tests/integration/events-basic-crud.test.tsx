import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  resetBelongClient,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { 
  setupAuthenticatedUser,
  type AuthSetupResult
} from './helpers/auth-helpers';
import { 
  generateEventData,
  performCleanupDeletion
} from './helpers/crud-test-patterns';

describe('Events Basic CRUD Integration Tests', () => {
  let authSetup: AuthSetupResult;
  let createdEventIds: string[] = [];
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

    createdEventIds = [];
  });

  afterEach(async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    // Clean up created events
    if (createdEventIds.length > 0) {
      const { result: deleteResult } = renderHook(() => useDeleteEvent(), {
        wrapper,
      });

      for (const eventId of createdEventIds) {
        await performCleanupDeletion(deleteResult, eventId, act, waitFor);
      }
    }

    resetBelongClient();
  });

  test('should successfully read events without authentication', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

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
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity }: AuthSetupResult = await setupAuthenticatedUser(wrapper);

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
    
    // Track for cleanup
    createdEventIds.push(createEventResult.current.data!.id);

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
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity }: AuthSetupResult = await setupAuthenticatedUser(wrapper);

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
    createdEventIds.push(createdEvent.id);

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
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
    );

    const { testUser, testCommunity }: AuthSetupResult = await setupAuthenticatedUser(wrapper);

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
      expect(deleteEventResult.current).toMatchObject({
        isSuccess: true,
        error: null,
      });
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