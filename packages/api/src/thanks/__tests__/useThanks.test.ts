import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ThanksInfo, Thanks } from "@belongnetwork/types";
import { useThanks } from "../hooks/useThanks";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the thanks service
vi.mock("../services/thanks.service", () => ({
  createThanksService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createThanksService } from "../services/thanks.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateThanksService = vi.mocked(createThanksService);
const mockFetchThanks = vi.fn();
const mockFetchThanksById = vi.fn();

describe("useThanks", () => {
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
    mockCreateThanksService.mockReturnValue({
      fetchThanks: mockFetchThanks,
      fetchThanksById: mockFetchThanksById,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return ThanksInfo[] from list() method", async () => {
    // Arrange: Mock return value should be ThanksInfo[]
    const mockThanksInfo: ThanksInfo[] = [
      {
        id: "thanks-1",
        message: "Thank you for the awesome drill!",
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

    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });
    
    // Manually list data
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const thanks = listdData![0];
    expect(typeof thanks.fromUserId).toBe("string");
    expect(typeof thanks.toUserId).toBe("string");
    expect(typeof thanks.resourceId).toBe("string");
    expect(typeof thanks.communityId).toBe("string");
    expect(thanks).not.toHaveProperty("fromUser");
    expect(thanks).not.toHaveProperty("toUser");
    expect(thanks).not.toHaveProperty("resource");
  });

  it("should pass filters to fetchThanks and return ThanksInfo[]", async () => {
    // Arrange
    const filters = { sentBy: "user-1" };
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });
    
    // Manually list data with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(filters);
  });

  it("should not fetch data automatically and have correct initial status", async () => {
    // Arrange
    const mockThanksInfo: ThanksInfo[] = [
      {
        id: "thanks-1",
        message: "Thank you!",
        fromUserId: "user-1",
        toUserId: "user-2",
        resourceId: "resource-1",
        communityId: "community-1",
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchThanks).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(false);

    // Act - Call list manually
    const listdData = await result.current.list();

    // Assert - Data should be fetched after manual list
    expect(listdData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledTimes(1);
    
    // Status should update after successful fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should allow list to be called with filters", async () => {
    // Arrange
    const filters = { sentBy: "user-1" };
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchThanks).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(filters);
    expect(mockFetchThanks).toHaveBeenCalledTimes(1);
  });

  it("should provide unified states that represent any operation (query + mutations)", async () => {
    // Arrange
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

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

  it("should return full Thanks object from byId() method", async () => {
    // Arrange: Mock return value should be full Thanks object
    const mockThanks: Thanks = {
      id: "thanks-1",
      message: "Thank you for the awesome drill!",
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

    mockFetchThanksById.mockResolvedValue(mockThanks);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });
    const fetchedThanks = await result.current.byId("thanks-1");

    // Assert
    expect(fetchedThanks).toEqual(mockThanks);
    expect(mockFetchThanksById).toHaveBeenCalledWith("thanks-1");

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedThanks.fromUser).toBe("object");
    expect(typeof fetchedThanks.toUser).toBe("object");
    expect(typeof fetchedThanks.resource).toBe("object");
    expect(typeof fetchedThanks.community).toBe("object");
    expect(fetchedThanks.fromUser.firstName).toBe("John");
    expect(fetchedThanks.toUser.firstName).toBe("Jane");
    expect(fetchedThanks.resource.title).toBe("Power Drill");
    expect(fetchedThanks.community.name).toBe("Test Community");
  });

  it("should handle byId with non-existent ID", async () => {
    // Arrange
    mockFetchThanksById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });
    const fetchedThanks = await result.current.byId("non-existent-id");

    // Assert
    expect(fetchedThanks).toBeNull();
    expect(mockFetchThanksById).toHaveBeenCalledWith("non-existent-id");
  });

  it("should have byId function available", () => {
    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe("function");
  });
});
