import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { CommunityInfo } from '@belongnetwork/types';
import { useCommunities } from '../hooks/useCommunities';

// Mock the auth provider
vi.mock('../../auth/providers/CurrentUserProvider', () => ({
  useSupabase: vi.fn(),
}));

// Mock the community service
vi.mock('../services/community.service', () => ({
  createCommunityService: vi.fn(),
}));

import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createCommunityService } from '../services/community.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateCommunityService = vi.mocked(createCommunityService);
const mockFetchCommunities = vi.fn();

describe('useCommunities', () => {
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
    });
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return CommunityInfo[] instead of Community[]', async () => {
    // Arrange: Mock return value should be CommunityInfo[]
    const mockCommunityInfo: CommunityInfo[] = [
      {
        id: 'community-1',
        name: 'Cambridge',
        description: 'Community for Cambridge residents',
        organizerId: 'user-1', // ID instead of User object
        parentId: 'community-0', // ID instead of Community object
        center: { lat: 42.3736, lng: -71.1097 },
        radiusKm: 10,
        hierarchyPath: [
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'Massachusetts' },
        ],
        level: 'city',
        memberCount: 150,
        timeZone: 'America/New_York',
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
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockCommunityInfo);
    expect(mockFetchCommunities).toHaveBeenCalledWith(undefined);
    
    // Verify the returned data has ID references, not full objects
    const community = result.current.data![0];
    expect(typeof community.organizerId).toBe('string');
    expect(community.parentId === null || typeof community.parentId === 'string').toBe(true);
    expect(community).not.toHaveProperty('organizer');
    expect(community).not.toHaveProperty('parent');
  });
});