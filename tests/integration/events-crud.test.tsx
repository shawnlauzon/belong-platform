import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  initializeBelong,
  useEvents,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useSignIn,
  useSignUp,
  useCommunities,
  resetBelongClient,
} from '@belongnetwork/platform';
import { TestWrapper } from './database/utils/test-wrapper';
import { generateTestName } from './database/utils/database-helpers';

describe('Events CRUD Integration Tests', () => {
  let testUser: { email: string; password: string; userId?: string };
  let testCommunity: { id?: string; name: string };
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

    // Generate unique test user
    testUser = {
      email: faker.internet.email(),
      password: faker.internet.password({ length: 12 }),
    };

    // Generate unique test community
    testCommunity = {
      name: generateTestName('Test Community'),
    };

    createdEventIds = [];
  });

  afterEach(async () => {
    // Clean up created events
    if (createdEventIds.length > 0) {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
      );

      const { result: deleteResult } = renderHook(() => useDeleteEvent(), {
        wrapper,
      });

      for (const eventId of createdEventIds) {
        await act(async () => {
          deleteResult.current.mutate(eventId);
        });
        
        await waitFor(() => {
          if (deleteResult.current.isError) {
            console.error('Delete event cleanup error:', deleteResult.current.error);
          }
          expect(deleteResult.current).toEqual(
            expect.objectContaining({
              isSuccess: true,
              error: null,
            })
          );
        });
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
      if (eventsResult.current.isError) {
        console.error('Fetch events error:', eventsResult.current.error);
      }
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

    // Get existing communities to use for testing
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (communitiesResult.current.isError) {
        console.error('Fetch communities error:', communitiesResult.current.error);
      }
      expect(communitiesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.any(Array),
          error: null,
        })
      );
    });
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

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

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

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create an event
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const startDate = faker.date.future();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const eventData = {
      title: generateTestName('Test Event'),
      description: faker.lorem.paragraph(),
      communityId: testCommunity.id!,
      organizerId: testUser.userId!,
      startDateTime: startDate,
      endDateTime: endDate,
      location: faker.location.streetAddress(),
      coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() },
      isActive: true,
    };

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => {
      if (createEventResult.current.isError) {
        console.error('Create event error:', createEventResult.current.error);
      }
      expect(createEventResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            isActive: eventData.isActive,
          }),
          error: null,
        })
      );
    });
    
    // Track for cleanup
    createdEventIds.push(createEventResult.current.data!.id);

    // Verify event appears in events list
    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      if (eventsResult.current.isError) {
        console.error('Fetch events list error:', eventsResult.current.error);
      }
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

    // Get existing communities to use for testing
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (communitiesResult.current.isError) {
        console.error('Fetch communities error:', communitiesResult.current.error);
      }
      expect(communitiesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.any(Array),
          error: null,
        })
      );
    });
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

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create an event first
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const startDate = faker.date.future();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const eventData = {
      title: generateTestName('Test Event to Update'),
      description: faker.lorem.paragraph(),
      communityId: testCommunity.id!,
      organizerId: testUser.userId!,
      startDateTime: startDate,
      endDateTime: endDate,
      location: faker.location.streetAddress(),
      coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() },
      isActive: true,
    };

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => {
      if (createEventResult.current.isError) {
        console.error('Create event error:', createEventResult.current.error);
      }
      expect(createEventResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: expect.any(String),
          }),
          error: null,
        })
      );
    });
    const createdEvent = createEventResult.current.data;
    expect(createdEvent).toBeDefined();

    // Track for cleanup
    createdEventIds.push(createdEvent!.id);

    // Update the event
    const { result: updateEventResult } = renderHook(() => useUpdateEvent(), {
      wrapper,
    });

    const updatedTitle = generateTestName('Updated Event');
    const updatedDescription = faker.lorem.paragraph();
    const updateData = {
      id: createdEvent!.id,
      title: updatedTitle,
      description: updatedDescription,
      startDateTime: eventData.startDateTime,
      endDateTime: eventData.endDateTime,
      location: eventData.location,
      coordinates: eventData.coordinates,
      isActive: eventData.isActive,
    };

    await act(async () => {
      updateEventResult.current.mutate(updateData);
    });

    await waitFor(() => {
      if (updateEventResult.current.isError) {
        console.error('Update event error:', updateEventResult.current.error);
      }
      expect(updateEventResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            id: createdEvent!.id,
            title: updatedTitle,
            description: updatedDescription,
            location: eventData.location,
            isActive: eventData.isActive,
          }),
          error: null,
        })
      );
    });

    // Verify event is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      if (verifyUpdateResult.current.isError) {
        console.error('Verify update error:', verifyUpdateResult.current.error);
      }
      expect(verifyUpdateResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: createdEvent!.id,
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

    // Get existing communities to use for testing
    const { result: communitiesResult } = renderHook(() => useCommunities(), {
      wrapper,
    });

    await waitFor(() => {
      if (communitiesResult.current.isError) {
        console.error('Fetch communities error:', communitiesResult.current.error);
      }
      expect(communitiesResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.any(Array),
          error: null,
        })
      );
    });
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

    await waitFor(() => {
      if (signUpResult.current.isError) {
        console.error('Sign up error:', signUpResult.current.error);
      }
      expect(signUpResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });
    testUser.userId = signUpResult.current.data?.user?.id;

    const { result: signInResult } = renderHook(() => useSignIn(), {
      wrapper,
    });

    await act(async () => {
      signInResult.current.mutate({
        email: testUser.email,
        password: testUser.password,
      });
    });

    await waitFor(() => {
      if (signInResult.current.isError) {
        console.error('Sign in error:', signInResult.current.error);
      }
      expect(signInResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              id: expect.any(String),
            }),
          }),
          error: null,
        })
      );
    });

    // Create an event first
    const { result: createEventResult } = renderHook(() => useCreateEvent(), {
      wrapper,
    });

    const startDate = faker.date.future();
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    const eventData = {
      title: generateTestName('Test Event to Delete'),
      description: faker.lorem.paragraph(),
      communityId: testCommunity.id!,
      organizerId: testUser.userId!,
      startDateTime: startDate,
      endDateTime: endDate,
      location: faker.location.streetAddress(),
      coordinates: { lat: faker.location.latitude(), lng: faker.location.longitude() },
      isActive: true,
    };

    await act(async () => {
      createEventResult.current.mutate(eventData);
    });

    await waitFor(() => expect(createEventResult.current.isSuccess).toBe(true));
    const createdEvent = createEventResult.current.data;
    expect(createdEvent).toBeDefined();

    // Delete the event
    const { result: deleteEventResult } = renderHook(() => useDeleteEvent(), {
      wrapper,
    });

    await act(async () => {
      deleteEventResult.current.mutate(createdEvent!.id);
    });

    await waitFor(() => {
      if (deleteEventResult.current.isError) {
        console.error('Delete event error:', deleteEventResult.current.error);
      }
      expect(deleteEventResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          error: null,
        })
      );
    });

    // Verify event is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      if (verifyDeleteResult.current.isError) {
        console.error('Verify delete error:', verifyDeleteResult.current.error);
      }
      expect(verifyDeleteResult.current).toEqual(
        expect.objectContaining({
          isSuccess: true,
          data: expect.not.arrayContaining([
            expect.objectContaining({
              id: createdEvent!.id,
            })
          ]),
          error: null,
        })
      );
    });
  });
});