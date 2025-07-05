import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fetchAndConsolidateCommunity } from '../../api/fetchAndConsolidateCommunity';
import { createMockSupabase } from '../../../../test-utils';
import { createMockCommunity, createMockCommunityInfo } from '../../__mocks__';
import { createMockUser } from '../../../users/__mocks__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import type { Community, CommunityInfo } from '../../types';

// Mock the API functions at the lowest level
vi.mock('../../api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

vi.mock('../../../users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

import { fetchCommunityById } from '../../api/fetchCommunityById';
import { fetchUserById } from '../../../users/api/fetchUserById';

const mockFetchCommunityById = vi.mocked(fetchCommunityById);
const mockFetchUserById = vi.mocked(fetchUserById);

describe('fetchAndConsolidateCommunity', () => {
  let queryClient: QueryClient;
  let mockSupabase: SupabaseClient<Database>;
  let mockCommunityInfo: CommunityInfo;
  let mockCommunity: Community;
  let mockOrganizer: User;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create mock data using factories
    mockOrganizer = createMockUser();
    mockCommunity = createMockCommunity({
      organizer: mockOrganizer,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizer, ...rest } = mockCommunity;
    mockCommunityInfo = {
      ...rest,
      organizerId: mockOrganizer.id,
    };

    mockSupabase = createMockSupabase();
  });

  it('should return consolidated Community when all data is available', async () => {
    // Arrange: Mock all API calls
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);
    mockFetchUserById.mockResolvedValue(mockOrganizer);

    // Act
    const result = await fetchAndConsolidateCommunity(
      mockSupabase,
      queryClient,
      mockCommunityInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.organizer).toEqual(mockOrganizer);
    expect(result?.id).toBe(mockCommunityInfo.id);
    expect(result?.name).toBe(mockCommunityInfo.name);
    expect(result?.description).toBe(mockCommunityInfo.description);

    // Should not have ID reference
    expect(result).not.toHaveProperty('organizerId');

    // Verify all API calls were made
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      mockCommunityInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      mockOrganizer.id,
    );
  });

  it('should return null when community is not found', async () => {
    // Arrange
    mockFetchCommunityById.mockResolvedValue(null);

    // Act
    const result = await fetchAndConsolidateCommunity(
      mockSupabase,
      queryClient,
      'nonexistent-id',
    );

    // Assert
    expect(result).toBeNull();
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should return null when organizer is not found', async () => {
    // Arrange
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);
    mockFetchUserById.mockResolvedValue(null); // Organizer not found

    // Act
    const result = await fetchAndConsolidateCommunity(
      mockSupabase,
      queryClient,
      mockCommunityInfo.id,
    );

    // Assert
    expect(result).toBeNull();
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      mockCommunityInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      mockOrganizer.id,
    );
  });

  it('should retrieve cached organizer (user) when available', async () => {
    // Arrange: Pre-populate user cache but not community cache
    queryClient.setQueryData(['user', mockOrganizer.id], mockOrganizer);
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);

    // Act
    const result = await fetchAndConsolidateCommunity(
      mockSupabase,
      queryClient,
      mockCommunityInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.organizer).toEqual(mockOrganizer);

    // Community should be fetched but user should come from cache
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      mockCommunityInfo.id,
    );
    expect(mockFetchUserById).not.toHaveBeenCalled(); // Should not be called due to cache
  });
});