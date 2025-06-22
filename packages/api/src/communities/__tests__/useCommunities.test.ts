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
      fetchCommunityById: vi.fn(),
      fetchCommunityMemberships: vi.fn(),
      fetchUserMemberships: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it("should return CommunityInfo[] in communities property", async () => {
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

    // Assert
    await waitFor(() => {
      expect(result.current.communities).toEqual(mockCommunityInfo);
    });

    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);

    // Verify the consolidated hook API structure
    expect(result.current).toHaveProperty("communities");
    expect(result.current).toHaveProperty("isLoading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("create");
    expect(result.current).toHaveProperty("update");
    expect(result.current).toHaveProperty("delete");
    expect(result.current).toHaveProperty("join");
    expect(result.current).toHaveProperty("leave");

    // Verify the returned data has ID references, not full objects
    const community = result.current.communities![0];
    expect(typeof community.organizerId).toBe("string");
    expect(
      community.parentId === null || typeof community.parentId === "string",
    ).toBe(true);
    expect(community).not.toHaveProperty("organizer");
    expect(community).not.toHaveProperty("parent");
  });

  it("should provide mutation functions", async () => {
    const mockCommunityData: CommunityData = {
      name: "Test Community",
      organizerId: "user-1",
      parentId: null,
      hierarchyPath: [{ level: "country", name: "United States" }],
      level: "city",
      memberCount: 0,
      timeZone: "America/New_York",
    };

    const mockCreatedCommunity: Community = {
      id: "community-new",
      name: "Test Community",
      organizer: { id: "user-1" } as any,
      parent: undefined,
      hierarchyPath: [{ level: "country", name: "United States" }],
      level: "city",
      memberCount: 0,
      timeZone: "America/New_York",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchCommunities.mockResolvedValue([]);
    mockCreateCommunity.mockResolvedValue(mockCreatedCommunity);

    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.communities).toEqual([]);
    });

    // Test create mutation
    await act(async () => {
      await result.current.create(mockCommunityData);
    });

    expect(mockCreateCommunity).toHaveBeenCalledWith(mockCommunityData);
  });
});
