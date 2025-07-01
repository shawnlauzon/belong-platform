import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useResources } from '../hooks/useResources';
import { BelongProvider } from '../../../config';

// Mock dependencies needed for BelongProvider
vi.mock('../../../shared/hooks/useSupabase', () => ({
  useSupabase: vi.fn(() => ({
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      })),
    },
    from: vi.fn(),
  })),
}));

// Mock client creation
vi.mock('../../../config/client', () => ({
  createBelongClient: vi.fn(() => ({
    supabase: {
      from: vi.fn(),
      auth: {
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        })),
      },
    },
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    mapbox: {
      autocomplete: vi.fn(),
      reverseGeocode: vi.fn(),
    },
  })),
}));

// Mock shared module to provide useSupabase, logger, and queryKeys
vi.mock('../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
    // Authentication state (not profile data)
    auth: ["auth"] as const,

    // User profile data - single source of truth for all user queries
    users: {
      all: ["users"] as const,
      byId: (id: string) => ["user", id] as const,
      search: (term: string) => ["users", "search", term] as const,
    },

    // Communities
    communities: {
      all: ["communities"] as const,
      byId: (id: string) => ["community", id] as const,
      memberships: (communityId: string) =>
        ["community", communityId, "memberships"] as const,
      userMemberships: (userId: string) =>
        ["user", userId, "memberships"] as const,
    },

    // Resources
    resources: {
      all: ["resources"] as const,
      byId: (id: string) => ["resource", id] as const,
      byCommunity: (communityId: string) =>
        ["resources", "community", communityId] as const,
      byOwner: (ownerId: string) => ["resources", "owner", ownerId] as const,
      filtered: (filter: Record<string, any>) =>
        ["resources", "filtered", filter] as const,
    },

    // Events
    events: {
      all: ["events"] as const,
      byId: (id: string) => ["event", id] as const,
      byCommunity: (communityId: string) =>
        ["events", "community", communityId] as const,
      byOrganizer: (organizerId: string) =>
        ["events", "organizer", organizerId] as const,
      attendees: (eventId: string) => ["event", eventId, "attendees"] as const,
      userAttendances: (userId: string) =>
        ["user", userId, "attendances"] as const,
      filtered: (filter: Record<string, any>) =>
        ["events", "filtered", filter] as const,
    },

    // Shoutouts
    shoutouts: {
      all: ["shoutouts"] as const,
      byId: (id: string) => ["shoutout", id] as const,
      byCommunity: (communityId: string) =>
        ["shoutouts", "community", communityId] as const,
      sentBy: (userId: string) => ["shoutouts", "sent", userId] as const,
      receivedBy: (userId: string) => ["shoutouts", "received", userId] as const,
      filtered: (filter: Record<string, any>) =>
        ["shoutouts", "filtered", filter] as const,
    },

    // Conversations
    conversations: {
      all: ["conversations"] as const,
      list: (userId: string) => ["conversations", "list", userId] as const,
      byId: (id: string) => ["conversation", id] as const,
      messages: (conversationId: string) => ["conversations", "messages", conversationId] as const,
      userList: (userId: string) => ["user", userId, "conversations"] as const,
    },
  } as const,
}));

// Mock the resource service
vi.mock('../services/resource.service', () => ({
  createResourceService: vi.fn(),
}));

import { useSupabase } from '../../../shared';
import { createResourceService } from '../services/resource.service';
import { Resource, ResourceCategory, ResourceInfo } from '../types';
import { createMockCommunity } from '../../communities/__mocks__';
import { createMockUser } from '../../users/__mocks__';
import { BelongProvider } from '../../../config';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResourceService = vi.mocked(createResourceService);
const mockFetchResources = vi.fn();
const mockFetchResourceById = vi.fn();

describe('useResources', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: any }) => any;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock supabase
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
        getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
      },
    };

    // Mock useSupabase to return our mock
    mockUseSupabase.mockReturnValue(mockSupabase);

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const testConfig = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-key',
      mapboxPublicToken: 'test-token',
    };

    wrapper = ({ children }: { children: any }) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(BelongProvider, { config: testConfig }, children)
      );

    // Setup service mocks
    mockCreateResourceService.mockReturnValue({
      fetchResources: mockFetchResources,
      fetchResourceById: mockFetchResourceById,
    });
  });

  it('should return ResourceInfo[] instead of Resource[] via list', async () => {
    // Arrange: Mock return value should be ResourceInfo[]
    const mockResourceInfo: ResourceInfo[] = [
      {
        id: 'resource-1',
        type: 'offer',
        category: 'tools' as ResourceCategory,
        title: 'Drill',
        description: 'Power drill for DIY projects',
        ownerId: 'user-1', // ID instead of User object
        communityId: 'community-1', // ID instead of Community object
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
    expect(typeof resource.ownerId).toBe('string');
    expect(typeof resource.communityId).toBe('string');
    expect(resource).not.toHaveProperty('owner');
    expect(resource).not.toHaveProperty('community');
  });

  it('should pass filters to fetchResources via list function', async () => {
    // Arrange
    const filters = { category: 'tools' as const };
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

  it('should not fetch data automatically and have correct initial status', () => {
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

  it('should allow list to be called without filters', async () => {
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

  it('should have list function available', () => {
    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    expect(result.current.list).toBeDefined();
    expect(typeof result.current.list).toBe('function');
  });

  it('should return full Resource object from byId() method', async () => {
    // Arrange: Mock return value should be full Resource object
    const mockResource: Resource = {
      id: 'resource-1',
      type: 'offer',
      title: 'Power Drill',
      description: 'High-quality power drill for all your DIY needs',
      category: 'tools' as ResourceCategory,
      community: createMockCommunity(),
      owner: createMockUser(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetchResourceById.mockResolvedValue(mockResource);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    const fetchedResource = await result.current.byId('resource-1');

    // Assert
    expect(fetchedResource).toEqual(mockResource);
    expect(mockFetchResourceById).toHaveBeenCalledWith('resource-1');

    // Verify the returned data has full objects, not just IDs
    expect(typeof fetchedResource!.owner).toBe('object');
    expect(typeof fetchedResource!.community).toBe('object');
    expect(fetchedResource!.title).toBe('Power Drill');
    expect(fetchedResource!.owner!.firstName).toBe(
      mockResource.owner.firstName
    );
    expect(fetchedResource!.community!.name).toBe(mockResource.community?.name);
  });

  it('should handle byId with non-existent ID', async () => {
    // Arrange
    mockFetchResourceById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });
    const fetchedResource = await result.current.byId('non-existent-id');

    // Assert
    expect(fetchedResource).toBeNull();
    expect(mockFetchResourceById).toHaveBeenCalledWith('non-existent-id');
  });

  it('should have byId function available', () => {
    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    expect(result.current.byId).toBeDefined();
    expect(typeof result.current.byId).toBe('function');
  });
});
