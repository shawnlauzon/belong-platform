import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { EventInfo, Event } from "@belongnetwork/types";
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
const mockFetchEventById = vi.fn();
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
      fetchEventById: mockFetchEventById,
      deleteEvent: mockDeleteEvent,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return EventInfo[] instead of Event[] via list", async () => {
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
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockEventInfo);
    expect(mockFetchEvents).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const event = listdData[0];
    expect(typeof event.organizerId).toBe("string");
    expect(typeof event.communityId).toBe("string");
    expect(event).not.toHaveProperty("organizer");
    expect(event).not.toHaveProperty("community");
  });

  it("should pass filters to fetchEvents via list function", async () => {
    // Arrange
    const filters = { communityId: "community-1" };
    const mockEventInfo: EventInfo[] = [];
    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });
    
    // Manually list data with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockEventInfo);
    expect(mockFetchEvents).toHaveBeenCalledWith(filters);
  });

  it("should not fetch data automatically and have correct initial status", () => {
    // Arrange
    const mockEventInfo: EventInfo[] = [];
    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchEvents).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isFetching).toBe(false);
  });

  it("should allow list to be called without filters", async () => {
    // Arrange
    const mockEventInfo: EventInfo[] = [];
    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchEvents).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without filters
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockEventInfo);
    expect(mockFetchEvents).toHaveBeenCalledWith(undefined);
    expect(mockFetchEvents).toHaveBeenCalledTimes(1);
  });

  it("should have list function available", () => {
    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert
    expect(result.current.list).toBeDefined();
    expect(typeof result.current.list).toBe("function");
  });

  it("should return full Event object from byId() method", async () => {
    // Arrange: Mock return value should be full Event object
    const mockEvent: Event = {
      id: "event-1",
      title: "Community BBQ",
      description: "Annual neighborhood BBQ event",
      startDateTime: new Date("2024-07-15T18:00:00Z"),
      endDateTime: new Date("2024-07-15T21:00:00Z"),
      location: "Community Park",
      maxAttendees: 50,
      organizer: {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      community: {
        id: "community-1",
        name: "Test Community",
        organizerId: "user-1",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchEventById.mockResolvedValue(mockEvent);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });
    const fetchedEvent = await result.current.byId("event-1");

    // Assert
    expect(fetchedEvent).toEqual(mockEvent);
    expect(mockFetchEventById).toHaveBeenCalledWith("event-1");

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedEvent.organizer).toBe("object");
    expect(typeof fetchedEvent.community).toBe("object");
    expect(fetchedEvent.title).toBe("Community BBQ");
    expect(fetchedEvent.organizer.firstName).toBe("John");
    expect(fetchedEvent.community.name).toBe("Test Community");
  });

  it("should handle byId with non-existent ID", async () => {
    // Arrange
    mockFetchEventById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });
    const fetchedEvent = await result.current.byId("non-existent-id");

    // Assert
    expect(fetchedEvent).toBeNull();
    expect(mockFetchEventById).toHaveBeenCalledWith("non-existent-id");
  });

  it("should have byId function available", () => {
    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe("function");
  });
});