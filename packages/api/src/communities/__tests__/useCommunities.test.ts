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

  it("should return CommunityInfo[] via retrieve function", async () => {
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
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);

    // Verify the returned data has ID references, not full objects
    const community = retrievedData[0];
    expect(typeof community.organizerId).toBe("string");
    expect(typeof community.parentId).toBe("string");
  });

  it("should pass options to fetchCommunities via retrieve function", async () => {
    // Arrange
    const options = { includeDeleted: true };
    const mockCommunityInfo: CommunityInfo[] = [];
    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });
    
    // Manually retrieve data with options
    const retrievedData = await result.current.retrieve(options);

    // Assert
    expect(retrievedData).toEqual(mockCommunityInfo);
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

  it("should allow retrieve to be called without options", async () => {
    // Arrange
    const mockCommunityInfo: CommunityInfo[] = [];
    mockFetchCommunities.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert - No automatic fetch
    expect(mockFetchCommunities).not.toHaveBeenCalled();
    expect(result.current.isPending).toBe(false);

    // Act - Retrieve without options
    const retrievedData = await result.current.retrieve();

    // Assert
    expect(retrievedData).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);
    expect(mockFetchCommunities).toHaveBeenCalledTimes(1);
  });

  it("should have retrieve function available", () => {
    // Act
    const { result } = renderHook(() => useCommunities(), { wrapper });

    // Assert
    expect(result.current.retrieve).toBeDefined();
    expect(typeof result.current.retrieve).toBe("function");
  });
});