import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ResourceInfo } from "@belongnetwork/types";
import { useResources } from "../hooks/useResources";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the resource service
vi.mock("../services/resource.service", () => ({
  createResourceService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createResourceService } from "../services/resource.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResourceService = vi.mocked(createResourceService);
const mockFetchResources = vi.fn();

describe("useResources", () => {
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
    mockCreateResourceService.mockReturnValue({
      fetchResources: mockFetchResources,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return ResourceInfo[] instead of Resource[] via retrieve", async () => {
    // Arrange: Mock return value should be ResourceInfo[]
    const mockResourceInfo: ResourceInfo[] = [
      {
        id: "resource-1",
        type: "offer",
        category: "tools" as const,
        title: "Drill",
        description: "Power drill for DIY projects",
        ownerId: "user-1", // ID instead of User object
        communityId: "community-1", // ID instead of Community object
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const resource = retrievedData[0];
    expect(typeof resource.ownerId).toBe("string");
    expect(typeof resource.communityId).toBe("string");
    expect(resource).not.toHaveProperty("owner");
    expect(resource).not.toHaveProperty("community");
  });

  it("should pass filters to fetchResources via retrieve function", async () => {
    // Arrange
    const filters = { category: "tools" as const };
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    
    // Manually retrieve data with filters
    const retrievedData = await result.current.retrieve(filters);

    // Assert
    expect(retrievedData).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(filters);
  });

  it("should not fetch data automatically and have correct initial status", () => {
    // Arrange
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // No pending since enabled: false
    expect(result.current.isFetching).toBe(false);
  });

  it("should allow retrieve to be called without filters", async () => {
    // Arrange
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without filters
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(undefined);
    expect(mockFetchResources).toHaveBeenCalledTimes(1);
  });

  it("should have retrieve function available", () => {
    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    expect(result.current.retrieve).toBeDefined();
    expect(typeof result.current.retrieve).toBe("function");
  });

});
