import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ThanksInfo } from "@belongnetwork/types";
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
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return ThanksInfo[] from retrieve() method", async () => {
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
    
    // Manually retrieve data
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const thanks = retrievedData![0];
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
    const { result } = renderHook(() => useThanks(filters), { wrapper });
    
    // Manually retrieve data
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockThanksInfo);
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
    expect(result.current.isPending).toBe(true); // No data yet, enabled: false
    expect(result.current.isError).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isFetching).toBe(false);

    // Act - Call retrieve manually
    const retrievedData = await result.current.retrieve();

    // Assert - Data should be fetched after manual retrieve
    expect(retrievedData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledTimes(1);
    
    // Status should update after successful fetch
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
      expect(result.current.isPending).toBe(false);
    });
  });

  it("should allow retrieve to be called with filters", async () => {
    // Arrange
    const initialFilters = { sentBy: "user-1" };
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(initialFilters), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchThanks).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(true);

    // Act - Retrieve with initial filters
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockThanksInfo);
    expect(mockFetchThanks).toHaveBeenCalledWith(initialFilters);
    expect(mockFetchThanks).toHaveBeenCalledTimes(1);
  });

  it("should provide unified states that represent any operation (query + mutations)", async () => {
    // Arrange
    const mockThanksInfo: ThanksInfo[] = [];
    mockFetchThanks.mockResolvedValue(mockThanksInfo);

    // Act
    const { result } = renderHook(() => useThanks(), { wrapper });

    // Assert - Initial state (query enabled: false, no mutations running)
    expect(result.current.isPending).toBe(true); // Query is pending (enabled: false = pending state)
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
});
