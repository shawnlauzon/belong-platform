import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { fetchAndCacheResource } from '../../api/fetchAndCacheResource';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource, createFakeResourceInfo } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { UserDetail } from '../../../users/types';
import type {
  CommunityDetail,
  CommunityInfo,
} from '../../../communities/types';

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
import { ResourceDetail, ResourceInfo } from '../../types';

const mockFetchResourceInfoById = vi.mocked(fetchResourceInfoById);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockFetchCommunityById = vi.mocked(fetchCommunityById);

describe('fetchAndCacheResource', () => {
  let queryClient: QueryClient;
  let mockSupabase: SupabaseClient<Database>;
  let fakeResourceInfo: ResourceInfo;
  let fakeResource: ResourceDetail;
  let fakeOwner: UserDetail;
  let fakeOrganizer: UserDetail;
  let fakeCommunity: CommunityDetail;
  let fakeCommunityInfo: CommunityInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create mock data using factories
    fakeOwner = createFakeUser();
    fakeOrganizer = createFakeUser();
    fakeCommunity = createFakeCommunity({
      organizer: fakeOrganizer,
    });
    fakeResource = createFakeResource({
      owner: fakeOwner,
      community: fakeCommunity,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizer, ...rest } = fakeCommunity;
    fakeCommunityInfo = {
      ...rest,
      organizerId: fakeOrganizer.id,
    };

    fakeResourceInfo = createFakeResourceInfo({
      ownerId: fakeOwner.id,
      communityId: fakeCommunity.id,
    });

    mockSupabase = createMockSupabase();
  });

  it('should return consolidated Resource when all data is available', async () => {
    // Arrange: Mock all API calls
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(fakeOwner) // First call for resource owner
      .mockResolvedValueOnce(fakeOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act
    const result = await fetchAndCacheResource(
      mockSupabase,
      queryClient,
      fakeResourceInfo.id,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result?.owner).toEqual(fakeOwner);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerId, ...expectedCommunityInfo } = fakeCommunityInfo;
    expect(result?.community).toEqual({
      ...expectedCommunityInfo,
      organizer: fakeOrganizer,
    });

    // Should not have ID references
    expect(result).not.toHaveProperty('ownerId');
    expect(result).not.toHaveProperty('communityId');
    expect(result?.community).not.toHaveProperty('organizerId');

    // Verify all API calls were made
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledTimes(2);
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      fakeCommunityInfo.id,
    );
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    mockFetchResourceInfoById.mockResolvedValue(null);

    // Act
    const result = await fetchAndCacheResource(
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
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById.mockResolvedValue(null); // Owner not found
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act
    const result = await fetchAndCacheResource(
      mockSupabase,
      queryClient,
      fakeResourceInfo.id,
    );

    // Assert
    expect(result).toBeNull();
  });

  it('should use cached data when available', async () => {
    // Arrange: Pre-populate cache
    queryClient.setQueryData(['resource', fakeResourceInfo.id], fakeResource);

    // Act
    const result = await fetchAndCacheResource(
      mockSupabase,
      queryClient,
      fakeResourceInfo.id,
    );

    // Assert
    expect(result).toEqual(fakeResource);

    // No API calls should be made when using cache
    expect(mockFetchResourceInfoById).not.toHaveBeenCalled();
    expect(mockFetchUserById).not.toHaveBeenCalled();
    expect(mockFetchCommunityById).not.toHaveBeenCalled();
  });
});
