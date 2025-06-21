import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useEvents,
  useSignOut,
  BelongProvider,
} from "@belongnetwork/platform";
// Updated to use BelongProvider directly instead of TestWrapper
import {
  createAndAuthenticateUser,
  type AuthSetupResult,
} from "./helpers/auth-helpers";
import {
  generateEventData,
  cleanupTestResources,
  commonDeleteSuccessExpectation,
} from "./helpers/crud-test-patterns";

describe("Events Basic CRUD Integration Tests", () => {
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
    // Clean up all test events using name-based cleanup
    await cleanupTestResources(
      wrapper,
      "event",
      () => renderHook(() => useEvents(), { wrapper }),
      () => renderHook(() => useEvents(), { wrapper }),
      act,
      waitFor,
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

  test("should successfully read events without authentication", async () => {
    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(eventsResult.current.events).toEqual(expect.any(Array));
      expect(eventsResult.current.error).toBe(null);
    });
  });

  test("should successfully create an event when authenticated", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event
    const { result: createEventResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    const eventData = generateEventData(testCommunity.id!, testUser.userId!);

    let createdEvent: any;
    await act(async () => {
      createdEvent = await createEventResult.current.create(eventData);
    });

    expect(createdEvent).toMatchObject({
      id: expect.any(String),
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      isActive: eventData.isActive,
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Verify event appears in events list
    const { result: eventsResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(eventsResult.current.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdEvent.id,
            title: eventData.title,
            location: eventData.location,
          }),
        ])
      );
      expect(eventsResult.current.error).toBe(null);
    });
  });

  test("should successfully update an event when authenticated as organizer", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event first
    const { result: createEventResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    const eventData = {
      ...generateEventData(testCommunity.id!, testUser.userId!),
      title: "Test Event to Update",
    };

    let createdEvent: any;
    await act(async () => {
      createdEvent = await createEventResult.current.create(eventData);
    });

    expect(createdEvent).toMatchObject({
      id: expect.any(String),
    });
    // Note: cleanup handled automatically by name-based cleanup in afterEach

    // Update the event
    const { result: updateEventResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    const updatedTitle = "Updated Event Title";
    const updatedDescription = "Updated event description";
    const updateData = {
      title: updatedTitle,
      description: updatedDescription,
    };

    let updatedEvent: any;
    await act(async () => {
      updatedEvent = await updateEventResult.current.update(createdEvent.id, updateData);
    });

    expect(updatedEvent).toMatchObject({
      id: createdEvent.id,
      title: updatedTitle,
      description: updatedDescription,
      location: eventData.location,
      isActive: eventData.isActive,
    });

    // Verify event is updated in the list
    const { result: verifyUpdateResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyUpdateResult.current.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: createdEvent.id,
            title: updatedTitle,
          }),
        ])
      );
      expect(verifyUpdateResult.current.error).toBe(null);
    });
  });

  test("should successfully delete an event when authenticated as organizer", async () => {
    const { testUser, testCommunity }: AuthSetupResult = authSetup;

    // Create an event first
    const { result: createEventResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    const eventData = {
      ...generateEventData(testCommunity.id!, testUser.userId!),
      title: "Test Event to Delete",
    };

    let createdEvent: any;
    await act(async () => {
      createdEvent = await createEventResult.current.create(eventData);
    });

    expect(createdEvent).toBeDefined();

    // Delete the event
    const { result: deleteEventResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await act(async () => {
      await deleteEventResult.current.delete(createdEvent.id);
    });

    // Delete operation should succeed without throwing

    // Verify event is deleted (or at least not findable in the list)
    const { result: verifyDeleteResult } = renderHook(() => useEvents(), {
      wrapper,
    });

    await waitFor(() => {
      expect(verifyDeleteResult.current.events).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            id: createdEvent.id,
          }),
        ])
      );
      expect(verifyDeleteResult.current.error).toBe(null);
    });
  });
});
