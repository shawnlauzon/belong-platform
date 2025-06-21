import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { EventInfo } from "@belongnetwork/types";
import { useEvents } from "../hooks/useEvents";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the event service
vi.mock("../services/event.service", () => ({
  createEventService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createEventService } from "../services/event.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateEventService = vi.mocked(createEventService);
const mockFetchEvents = vi.fn();
const mockDeleteEvent = vi.fn();

describe("useEvents", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();

    // Setup mocks
    mockUseSupabase.mockReturnValue({} as any);
    mockCreateEventService.mockReturnValue({
      fetchEvents: mockFetchEvents,
      deleteEvent: mockDeleteEvent,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return EventInfo[] instead of Event[]", async () => {
    // Arrange: Mock return value should be EventInfo[]
    const mockEventInfo: EventInfo[] = [
      {
        id: "event-1",
        title: "Community BBQ",
        description: "Join us for a summer BBQ",
        organizerId: "user-1", // ID instead of User object
        communityId: "community-1", // ID instead of Community object
        startDateTime: new Date("2024-07-15T18:00:00Z"),
        location: "Central Park",
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 25,
        registrationRequired: false,
        isActive: true,
        tags: ["food", "social"],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.events).toEqual(mockEventInfo);
    });

    // Already checked in waitFor above
    expect(mockFetchEvents).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const event = result.current.events![0];
    expect(typeof event.organizerId).toBe("string");
    expect(typeof event.communityId).toBe("string");
    expect(event).not.toHaveProperty("organizer");
    expect(event).not.toHaveProperty("community");
  });

  it("should pass filters to fetchEvents and return EventInfo[]", async () => {
    // Arrange
    const filters = { communityId: "community-1" };
    const mockEventInfo: EventInfo[] = [];
    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.events).toEqual(mockEventInfo);
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(filters);
    // Already checked in waitFor above
  });

  it("should invalidate cache and remove deleted event from events list", async () => {
    // Arrange: Set up initial events in cache
    const initialEvents: EventInfo[] = [
      {
        id: "event-1",
        title: "Event to Delete",
        description: "This event will be deleted",
        organizerId: "user-1",
        communityId: "community-1",
        startDateTime: new Date("2024-07-15T18:00:00Z"),
        location: "Test Location",
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 5,
        registrationRequired: false,
        isActive: true,
        tags: ["test"],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "event-2",
        title: "Event to Keep",
        description: "This event will remain",
        organizerId: "user-1",
        communityId: "community-1",
        startDateTime: new Date("2024-07-16T18:00:00Z"),
        location: "Test Location 2",
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 10,
        registrationRequired: false,
        isActive: true,
        tags: ["test"],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const eventsAfterDelete = initialEvents.slice(1); // Remove first event

    // Mock initial fetch to return all events
    mockFetchEvents.mockResolvedValueOnce(initialEvents);
    
    // Render hook and wait for initial data
    const { result } = renderHook(() => useEvents(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.events).toEqual(initialEvents);
    });

    // Verify initial state
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "event-1" }),
        expect.objectContaining({ id: "event-2" }),
      ])
    );

    // Mock delete success and subsequent fetch to return updated events
    mockDeleteEvent.mockResolvedValueOnce(undefined);
    mockFetchEvents.mockResolvedValueOnce(eventsAfterDelete);

    // Act: Delete the first event
    await result.current.delete("event-1");

    // Assert: Verify cache was invalidated and event was removed
    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });

    // The critical assertion: deleted event should not appear in the list
    expect(result.current.events).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "event-1" }),
      ])
    );

    // Verify only the remaining event is present
    expect(result.current.events).toEqual([
      expect.objectContaining({ id: "event-2" }),
    ]);

    // Verify the service was called correctly
    expect(mockDeleteEvent).toHaveBeenCalledWith("event-1");
    expect(mockFetchEvents).toHaveBeenCalledTimes(2); // Initial + after delete
  });

  it("should invalidate cache for filtered events query after delete", async () => {
    // Arrange: Set up filtered events query with initial data
    const filters = { communityId: "community-1" };
    const initialEvents: EventInfo[] = [
      {
        id: "event-1",
        title: "Event to Delete",
        description: "This event will be deleted",
        organizerId: "user-1",
        communityId: "community-1",
        startDateTime: new Date("2024-07-15T18:00:00Z"),
        location: "Test Location",
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 5,
        registrationRequired: false,
        isActive: true,
        tags: ["test"],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "event-2",
        title: "Event to Keep",
        description: "This event will remain",
        organizerId: "user-1",
        communityId: "community-1",
        startDateTime: new Date("2024-07-16T18:00:00Z"),
        location: "Test Location 2",
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 10,
        registrationRequired: false,
        isActive: true,
        tags: ["test"],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const eventsAfterDelete = initialEvents.slice(1); // Remove first event

    // Mock initial fetch to return all events
    mockFetchEvents.mockResolvedValueOnce(initialEvents);
    
    // Render hook with filters and wait for initial data
    const { result } = renderHook(() => useEvents(filters), { wrapper });
    
    await waitFor(() => {
      expect(result.current.events).toEqual(initialEvents);
    });

    // Verify initial state
    expect(result.current.events).toHaveLength(2);
    expect(result.current.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "event-1" }),
        expect.objectContaining({ id: "event-2" }),
      ])
    );

    // Mock delete success and subsequent fetch to return updated events
    mockDeleteEvent.mockResolvedValueOnce(undefined);
    mockFetchEvents.mockResolvedValueOnce(eventsAfterDelete);

    // Act: Delete the first event
    await result.current.delete("event-1");

    // Assert: Verify cache was invalidated and event was removed
    await waitFor(() => {
      expect(result.current.events).toHaveLength(1);
    });

    // The critical assertion: deleted event should not appear in the filtered list
    expect(result.current.events).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ id: "event-1" }),
      ])
    );

    // Verify only the remaining event is present
    expect(result.current.events).toEqual([
      expect.objectContaining({ id: "event-2" }),
    ]);

    // Verify the service was called correctly
    expect(mockDeleteEvent).toHaveBeenCalledWith("event-1");
    expect(mockFetchEvents).toHaveBeenCalledTimes(2); // Initial + after delete
    expect(mockFetchEvents).toHaveBeenCalledWith(filters); // Both calls should use filters
  });
});
