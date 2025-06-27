import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ResourceInfo, Resource } from "@belongnetwork/types";
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
const mockFetchResourceById = vi.fn();

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
      fetchResourceById: mockFetchResourceById,
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return ResourceInfo[] instead of Resource[] via list", async () => {
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
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const resource = listdData[0];
    expect(typeof resource.ownerId).toBe("string");
    expect(typeof resource.communityId).toBe("string");
    expect(resource).not.toHaveProperty("owner");
    expect(resource).not.toHaveProperty("community");
  });

  it("should pass filters to fetchResources via list function", async () => {
    // Arrange
    const filters = { category: "tools" as const };
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    
    // Manually list data with filters
    const listdData = await result.current.list(filters);

    // Assert
    expect(listdData).toEqual(mockResourceInfo);
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

  it("should allow list to be called without filters", async () => {
    // Arrange
    const mockResourceInfo: ResourceInfo[] = [];
    mockFetchResources.mockResolvedValue(mockResourceInfo);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without filters
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockResourceInfo);
    expect(mockFetchResources).toHaveBeenCalledWith(undefined);
    expect(mockFetchResources).toHaveBeenCalledTimes(1);
  });

  it("should have list function available", () => {
    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    expect(result.current.list).toBeDefined();
    expect(typeof result.current.list).toBe("function");
  });

  it("should return full Resource object from byId() method", async () => {
    // Arrange: Mock return value should be full Resource object
    const mockResource: Resource = {
      id: "resource-1",
      type: "offer",
      title: "Power Drill",
      description: "High-quality power drill for all your DIY needs",
      category: "tools",
      owner: {
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
      ownerId: "user-1",
      communityId: "community-1",
      isAvailable: true,
      condition: "excellent",
      imageUrls: ["https://example.com/drill.jpg"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchResourceById.mockResolvedValue(mockResource);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    const fetchedResource = await result.current.byId("resource-1");

    // Assert
    expect(fetchedResource).toEqual(mockResource);
    expect(mockFetchResourceById).toHaveBeenCalledWith("resource-1");

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedResource.owner).toBe("object");
    expect(typeof fetchedResource.community).toBe("object");
    expect(fetchedResource.title).toBe("Power Drill");
    expect(fetchedResource.owner.firstName).toBe("John");
    expect(fetchedResource.community.name).toBe("Test Community");
  });

  it("should handle byId with non-existent ID", async () => {
    // Arrange
    mockFetchResourceById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    const fetchedResource = await result.current.byId("non-existent-id");

    // Assert
    expect(fetchedResource).toBeNull();
    expect(mockFetchResourceById).toHaveBeenCalledWith("non-existent-id");
  });

  it("should have byId function available", () => {
    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe("function");
  });

});
