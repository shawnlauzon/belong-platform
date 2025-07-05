import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fetchAndCacheCommunity } from '../../api/fetchAndCacheCommunity';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeCommunity, createFakeCommunityInfo } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
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

describe('fetchAndCacheCommunity', () => {
  let queryClient: QueryClient;
  let mockSupabase: SupabaseClient<Database>;
  let fakeCommunityInfo: CommunityInfo;
  let fakeCommunity: Community;
  let fakeOrganizer: User;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create mock data using factories
    fakeOrganizer = createFakeUser();
    fakeCommunity = createFakeCommunity({
      organizer: fakeOrganizer,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizer, ...rest } = fakeCommunity;
    fakeCommunityInfo = {
      ...rest,
      organizerId: fakeOrganizer.id,
    };

    mockSupabase = createMockSupabase();
  });

  it('should return consolidated Community when all data is available', async () => {
    // Arrange: Mock all API calls
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);
    mockFetchUserById.mockResolvedValue(fakeOrganizer);

    // Act
    const result = await fetchAndCacheCommunity(
      mockSupabase,
      queryClient,
      fakeCommunityInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.organizer).toEqual(fakeOrganizer);
    expect(result?.id).toBe(fakeCommunityInfo.id);
    expect(result?.name).toBe(fakeCommunityInfo.name);
    expect(result?.description).toBe(fakeCommunityInfo.description);

    // Should not have ID reference
    expect(result).not.toHaveProperty('organizerId');

    // Verify all API calls were made
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      fakeCommunityInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      fakeOrganizer.id,
    );
  });

  it('should return null when community is not found', async () => {
    // Arrange
    mockFetchCommunityById.mockResolvedValue(null);

    // Act
    const result = await fetchAndCacheCommunity(
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
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);
    mockFetchUserById.mockResolvedValue(null); // Organizer not found

    // Act
    const result = await fetchAndCacheCommunity(
      mockSupabase,
      queryClient,
      fakeCommunityInfo.id,
    );

    // Assert
    expect(result).toBeNull();
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      fakeCommunityInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      fakeOrganizer.id,
    );
  });

  it('should retrieve cached organizer (user) when available', async () => {
    // Arrange: Pre-populate user cache but not community cache
    queryClient.setQueryData(['user', fakeOrganizer.id], fakeOrganizer);
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act
    const result = await fetchAndCacheCommunity(
      mockSupabase,
      queryClient,
      fakeCommunityInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.organizer).toEqual(fakeOrganizer);

    // Community should be fetched but user should come from cache
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      fakeCommunityInfo.id,
    );
    expect(mockFetchUserById).not.toHaveBeenCalled(); // Should not be called due to cache
  });
});