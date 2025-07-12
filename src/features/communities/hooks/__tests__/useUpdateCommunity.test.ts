import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useUpdateCommunity } from '../useUpdateCommunity';
import { useCommunity } from '../useCommunity';
import { createTestWrapper } from '@/test-utils';
import { createFakeCommunity } from '../../__fakes__';

// Mock the API functions
vi.mock('@/features/communities/api/updateCommunity', () => ({
  updateCommunity: vi.fn(),
}));


vi.mock('@/features/communities/api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

vi.mock('@/features/users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

// Mock logger
vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    logger: {
      info: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('useUpdateCommunity caching behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invalidate cache after updating community so fresh data is fetched', async () => {
    // This test reproduces the caching issue where after updating a community,
    // the useCommunity hook still returns old cached data
    const communityId = 'test-community-id';
    const originalCommunity = createFakeCommunity({ 
      id: communityId,
      name: 'Original Community Name',
      description: 'Original description' 
    });
    
    const updatedCommunity = createFakeCommunity({ 
      id: communityId,
      name: 'Updated Community Name',
      description: 'Updated description' 
    });

    // Mock the API functions
    const { updateCommunity } = await import('@/features/communities/api/updateCommunity');
    const { fetchCommunityById } = await import('@/features/communities/api/fetchCommunityById');
    
    // Setup mock behavior to simulate real caching issue
    // First call returns original community and caches it
    vi.mocked(fetchCommunityById).mockResolvedValueOnce(originalCommunity);
    vi.mocked(updateCommunity).mockResolvedValueOnce(updatedCommunity);

    const { wrapper, queryClient } = createTestWrapper();

    // First, fetch the community to populate cache
    const { result: communityResult } = renderHook(() => useCommunity(communityId), { wrapper });
    await waitFor(() => expect(communityResult.current.data).toEqual(originalCommunity));

    // Verify data is cached by checking queryClient
    const cachedData = queryClient.getQueryData(['community', communityId]);
    expect(cachedData).toEqual(originalCommunity);

    // Now update the community
    const { result: updateResult } = renderHook(() => useUpdateCommunity(), { wrapper });
    
    // For the second call, mock should return updated data but cache might still have old data
    vi.mocked(fetchCommunityById).mockResolvedValueOnce(updatedCommunity);
    
    // Trigger the update
    await updateResult.current.mutateAsync({
      id: communityId,
      name: 'Updated Community Name',
      description: 'Updated description'
    });

    // Wait for the mutation to complete
    await waitFor(() => expect(updateResult.current.isSuccess).toBe(true));

    // Verify that fetchAndCacheCommunity was called again after invalidation
    // The first call was for the initial fetch, the second should be after invalidation
    expect(vi.mocked(fetchCommunityById)).toHaveBeenCalledTimes(2);

    // Now fetch the community again - it should return the updated data
    const { result: freshCommunityResult } = renderHook(() => useCommunity(communityId), { wrapper });
    
    // This should pass - the cache should be invalidated and fresh data should be fetched
    await waitFor(() => {
      expect(freshCommunityResult.current.data).toEqual(updatedCommunity);
      expect(freshCommunityResult.current.data?.name).toBe('Updated Community Name');
    });
  });
});