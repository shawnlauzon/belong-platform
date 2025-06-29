import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ShoutoutInfo, Shoutout } from "@belongnetwork/types";
import { useShoutouts } from "../hooks/useShoutouts";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the shoutout service
vi.mock("../services/shoutouts.service", () => ({
  createShoutoutsService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createShoutoutsService } from "../services/shoutouts.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateShoutoutsService = vi.mocked(createShoutoutsService);
const mockFetchShoutouts = vi.fn();
const mockFetchShoutoutsById = vi.fn();

describe("useShoutouts", () => {
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
    mockCreateShoutoutsService.mockReturnValue({
      fetchShoutouts: mockFetchShoutouts,
      fetchShoutoutById: mockFetchShoutoutsById,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return ShoutoutInfo[] from list() method", async () => {
    // Arrange: Mock return value should be ShoutoutInfo[]
    const mockShoutoutInfo: ShoutoutInfo[] = [
      {
        id: "shoutout-1",
        message: "Shoutout for the awesome drill!",
        fromUserId: "user-1", // ID instead of User object
        toUserId: "user-2", // ID instead of User object
        resourceId: "resource-1", // ID instead of Resource object
        communityId: "community-1", // Added for safety
        impactDescription: "Helped me fix my fence",
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });
    
    // Manually list data
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const shoutout = listdData![0];
    expect(typeof shoutout.fromUserId).toBe("string");
    expect(typeof shoutout.toUserId).toBe("string");
    expect(typeof shoutout.resourceId).toBe("string");
    expect(typeof shoutout.communityId).toBe("string");
    expect(shoutout).not.toHaveProperty("fromUser");
    expect(shoutout).not.toHaveProperty("toUser");
    expect(shoutout).not.toHaveProperty("resource");
  });

  it("should pass filters to fetchShoutout and return ShoutoutInfo[]", async () => {
    // Arrange
    const filters = { sentBy: "user-1" };
    const mockShoutoutInfo: ShoutoutInfo[] = [];
    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });
    
    // Manually list data with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledWith(filters);
  });

  it("should not fetch data automatically and have correct initial status", async () => {
    // Arrange
    const mockShoutoutInfo: ShoutoutInfo[] = [
      {
        id: "shoutout-1",
        message: "Shoutout!",
        fromUserId: "user-1",
        toUserId: "user-2",
        resourceId: "resource-1",
        communityId: "community-1",
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchShoutouts).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(false);

    // Act - Call list manually
    const listdData = await result.current.list();

    // Assert - Data should be fetched after manual list
    expect(listdData).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledTimes(1);
    
    // Status should update after successful fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should allow list to be called with filters", async () => {
    // Arrange
    const filters = { sentBy: "user-1" };
    const mockShoutoutInfo: ShoutoutInfo[] = [];
    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchShoutouts).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockShoutoutInfo);
    expect(mockFetchShoutouts).toHaveBeenCalledWith(filters);
    expect(mockFetchShoutouts).toHaveBeenCalledTimes(1);
  });

  it("should provide unified states that represent any operation (query + mutations)", async () => {
    // Arrange
    const mockShoutoutInfo: ShoutoutInfo[] = [];
    mockFetchShoutouts.mockResolvedValue(mockShoutoutInfo);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Assert - Initial state (query enabled: false, no mutations running)
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);

    // Verify individual mutation objects are available
    expect(result.current.createMutation).toBeDefined();
    expect(result.current.updateMutation).toBeDefined();
    expect(result.current.deleteMutation).toBeDefined();

    // Verify mutation functions are available
    expect(typeof result.current.create).toBe('function');
    expect(typeof result.current.update).toBe('function');
    expect(typeof result.current.delete).toBe('function');
  });

  it("should return full Shoutout object from byId() method", async () => {
    // Arrange: Mock return value should be full Shoutout object
    const mockShoutout: Shoutout = {
      id: "shoutout-1",
      message: "Shoutout for the awesome drill!",
      fromUser: {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      toUser: {
        id: "user-2", 
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      resource: {
        id: "resource-1",
        type: "offer",
        title: "Power Drill",
        description: "High-quality power drill",
        category: "tools",
        ownerId: "user-1",
        communityId: "community-1",
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
      impactDescription: "Helped me fix my fence",
      imageUrls: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchShoutoutsById.mockResolvedValue(mockShoutout);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });
    const fetchedShoutout = await result.current.byId("shoutout-1");

    // Assert
    expect(fetchedShoutout).toEqual(mockShoutout);
    expect(mockFetchShoutoutsById).toHaveBeenCalledWith("shoutout-1");

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedShoutout.fromUser).toBe("object");
    expect(typeof fetchedShoutout.toUser).toBe("object");
    expect(typeof fetchedShoutout.resource).toBe("object");
    expect(typeof fetchedShoutout.community).toBe("object");
    expect(fetchedShoutout.fromUser.firstName).toBe("John");
    expect(fetchedShoutout.toUser.firstName).toBe("Jane");
    expect(fetchedShoutout.resource.title).toBe("Power Drill");
    expect(fetchedShoutout.community.name).toBe("Test Community");
  });

  it("should handle byId with non-existent ID", async () => {
    // Arrange
    mockFetchShoutoutsById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });
    const fetchedShoutout = await result.current.byId("non-existent-id");

    // Assert
    expect(fetchedShoutout).toBeNull();
    expect(mockFetchShoutoutsById).toHaveBeenCalledWith("non-existent-id");
  });

  it("should have byId function available", () => {
    // Act
    const { result } = renderHook(() => useShoutouts(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe("function");
  });
});
