import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fetchAndConsolidateResource } from '../../api/fetchAndConsolidateResource';
import { createMockSupabase } from '../../../../test-utils';
import { createMockResource, createMockResourceInfo } from '../../__mocks__';
import { createMockUser } from '../../../users/__mocks__';
import { createMockCommunity } from '../../../communities/__mocks__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import type { Community, CommunityInfo } from '../../../communities/types';

// Mock the API functions at the lowest level
vi.mock('../../api/fetchResourceInfoById', () => ({
  fetchResourceInfoById: vi.fn(),
}));

vi.mock('../../../users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

vi.mock('../../../communities/api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

import { fetchResourceInfoById } from '../../api/fetchResourceInfoById';
import { fetchUserById } from '../../../users/api/fetchUserById';
import { fetchCommunityById } from '../../../communities/api/fetchCommunityById';
import { Resource, ResourceInfo } from '../../types';

const mockFetchResourceInfoById = vi.mocked(fetchResourceInfoById);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockFetchCommunityById = vi.mocked(fetchCommunityById);

describe('fetchAndConsolidateResource', () => {
  let queryClient: QueryClient;
  let mockSupabase: SupabaseClient<Database>;
  let mockResourceInfo: ResourceInfo;
  let mockResource: Resource;
  let mockOwner: User;
  let mockOrganizer: User;
  let mockCommunity: Community;
  let mockCommunityInfo: CommunityInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create mock data using factories
    mockOwner = createMockUser();
    mockOrganizer = createMockUser();
    mockCommunity = createMockCommunity({
      organizer: mockOrganizer,
    });
    mockResource = createMockResource({
      owner: mockOwner,
      community: mockCommunity,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizer, ...rest } = mockCommunity;
    mockCommunityInfo = {
      ...rest,
      organizerId: mockOrganizer.id,
    };

    mockResourceInfo = createMockResourceInfo({
      ownerId: mockOwner.id,
      communityId: mockCommunity.id,
    });

    mockSupabase = createMockSupabase();
  });

  it('should return consolidated Resource when all data is available', async () => {
    // Arrange: Mock all API calls
    mockFetchResourceInfoById.mockResolvedValue(mockResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(mockOwner) // First call for resource owner
      .mockResolvedValueOnce(mockOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);

    // Act
    const result = await fetchAndConsolidateResource(
      mockSupabase,
      queryClient,
      mockResourceInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.owner).toEqual(mockOwner);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerId, ...expectedCommunityInfo } = mockCommunityInfo;
    expect(result?.community).toEqual({
      ...expectedCommunityInfo,
      organizer: mockOrganizer,
    });

    // Should not have ID references
    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('communityId');
    expect(result?.community).not.toHaveProperty('organizerId');

    // Verify all API calls were made
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledTimes(2);
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      mockCommunityInfo.id,
    );
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    mockFetchResourceInfoById.mockResolvedValue(null);

    // Act
    const result = await fetchAndConsolidateResource(
      mockSupabase,
      queryClient,
      'nonexistent-id',
    );

    // Assert
    expect(result).toBeNull();
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
    expect(mockFetchUserById).not.toHaveBeenCalled();
    expect(mockFetchCommunityById).not.toHaveBeenCalled();
  });

  it('should return null when owner is not found', async () => {
    // Arrange
    mockFetchResourceInfoById.mockResolvedValue(mockResourceInfo);
    mockFetchUserById.mockResolvedValue(null); // Owner not found
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);

    // Act
    const result = await fetchAndConsolidateResource(
      mockSupabase,
      queryClient,
      mockResourceInfo.id,
    );

    // Assert
    expect(result).toBeNull();
  });

  it('should use cached data when available', async () => {
    // Arrange: Pre-populate cache
    queryClient.setQueryData(['resource', mockResourceInfo.id], mockResource);

    // Act
    const result = await fetchAndConsolidateResource(
      mockSupabase,
      queryClient,
      mockResourceInfo.id,
    );

    // Assert
    expect(result).toEqual(mockResource);

    // No API calls should be made when using cache
    expect(mockFetchResourceInfoById).not.toHaveBeenCalled();
    expect(mockFetchUserById).not.toHaveBeenCalled();
    expect(mockFetchCommunityById).not.toHaveBeenCalled();
  });
});
