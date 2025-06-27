import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type {
  CommunityInfo,
  Community,
  CommunityData,
} from "@belongnetwork/types";
import { useCommunities } from "../hooks/useCommunities";

// Mock the auth provider
vi.mock("../../auth/providers/CurrentUserProvider", () => ({
  useSupabase: vi.fn(),
}));

// Mock the community service
vi.mock("../services/community.service", () => ({
  createCommunityService: vi.fn(),
}));

import { useSupabase } from "../../auth/providers/CurrentUserProvider";
import { createCommunityService } from "../services/community.service";

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateCommunityService = vi.mocked(createCommunityService);
const mockFetchCommunities = vi.fn();
const mockFetchCommunityById = vi.fn();
const mockCreateCommunity = vi.fn();

describe("useCommunities consolidated hook", () => {
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
    mockCreateCommunityService.mockReturnValue({
      fetchCommunities: mockFetchCommunities,
      fetchCommunityById: mockFetchCommunityById,
      createCommunity: mockCreateCommunity,
      updateCommunity: vi.fn(),
      deleteCommunity: vi.fn(),
      joinCommunity: vi.fn(),
      leaveCommunity: vi.fn(),
    } as any);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it("should return CommunityInfo[] via list function", async () => {
    // Arrange: Mock return value should be CommunityInfo[]
    const mockCommunityInfo: CommunityInfo[] = [
      {
        id: "community-1",
        name: "Cambridge",
        description: "Community for Cambridge residents",
        organizerId: "user-1", // ID instead of User object
        parentId: "community-0", // ID instead of Community object
        center: { lat: 42.3736, lng: -71.1097 },
        radiusKm: 10,
        hierarchyPath: [
          { level: "country", name: "United States" },
          { level: "state", name: "Massachusetts" },
        ],
        level: "city",
        memberCount: 150,
        timeZone: "America/New_York",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const community = listdData[0];
    expect(typeof community.organizerId).toBe("string");
    expect(typeof community.parentId).toBe("string");
  });

  it("should pass options to fetchCommunities via list function", async () => {
    // Arrange
    const options = { includeDeleted: true };
    const mockCommunityInfo: CommunityInfo[] = [];
    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });
    
    // Manually list data with options
    const listdData = await result.current.list(options);

    // Assert
    expect(listdData).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(options);
  });

  it("should not fetch data automatically and have correct initial status", () => {
    // Arrange
    const mockCommunityInfo: CommunityInfo[] = [];
    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert - Data should not be fetched automatically and status should be correct
    expect(mockFetchCommunities).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false); // Query is idle (enabled: false = not pending)
    expect(result.current.isFetching).toBe(false);
  });

  it("should allow list to be called without options", async () => {
    // Arrange
    const mockCommunityInfo: CommunityInfo[] = [];
    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchCommunities).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without options
    const listdData = await result.current.list();

    // Assert
    expect(listdData).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);
    expect(mockFetchCommunities).toHaveBeenCalledTimes(1);
  });

  it("should have list function available", () => {
    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert
    expect(result.current.list).toBeDefined();
    expect(typeof result.current.list).toBe("function");
  });

  it("should return full Community object from byId() method", async () => {
    // Arrange: Mock return value should be full Community object
    const mockCommunity: Community = {
      id: "community-1",
      name: "Test Community",
      description: "A wonderful test community",
      organizerId: "user-1",
      organizer: {
        id: "user-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      parentId: null,
      settings: {
        isPublic: true,
        allowMemberInvites: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchCommunityById.mockResolvedValue(mockCommunity);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });
    const fetchedCommunity = await result.current.byId("community-1");

    // Assert
    expect(fetchedCommunity).toEqual(mockCommunity);
    expect(mockFetchCommunityById).toHaveBeenCalledWith("community-1");

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedCommunity.organizer).toBe("object");
    expect(fetchedCommunity.name).toBe("Test Community");
    expect(fetchedCommunity.organizer.firstName).toBe("John");
    expect(fetchedCommunity.description).toBe("A wonderful test community");
  });

  it("should handle byId with non-existent ID", async () => {
    // Arrange
    mockFetchCommunityById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });
    const fetchedCommunity = await result.current.byId("non-existent-id");

    // Assert
    expect(fetchedCommunity).toBeNull();
    expect(mockFetchCommunityById).toHaveBeenCalledWith("non-existent-id");
  });

  it("should have byId function available", () => {
    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe("function");
  });
});