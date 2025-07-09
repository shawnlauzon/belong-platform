import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { useResource } from '../../hooks/useResource';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResourceInfo } from '../../__fakes__/';
import { createFakeUserDetail } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import { BelongProvider } from '../../../../config';
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

import { useSupabase, queryKeys } from '../../../../shared';
import { fetchResourceInfoById } from '../../api/fetchResourceInfoById';
import { fetchUserById } from '../../../users/api/fetchUserById';
import { fetchCommunityById } from '../../../communities/api/fetchCommunityById';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceInfoById = vi.mocked(fetchResourceInfoById);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockFetchCommunityById = vi.mocked(fetchCommunityById);

/**
 * Creates a test wrapper with cache-friendly settings for testing cache behavior
 */
function createCacheTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 5000, // Keep data fresh for 5 seconds to test caching
      },
      mutations: { retry: false },
    },
  });

  const config = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-key',
    mapboxPublicToken: 'test-token',
  };

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(BelongProvider, {
        config,
        children,
      }),
    );

  return { wrapper, queryClient };
}

describe('useResource - Cache Behavior', () => {
  let wrapper: ReturnType<typeof createCacheTestWrapper>['wrapper'];
  let queryClient: QueryClient;
  let mockSupabase: SupabaseClient<Database>;
  let fakeResourceInfo: ReturnType<typeof createFakeResourceInfo>;
  let fakeOwner: UserDetail;
  let fakeOrganizer: UserDetail;
  let fakeCommunity: CommunityDetail;
  let fakeCommunityInfo: CommunityInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeOwner = createFakeUserDetail();
    fakeOrganizer = createFakeUserDetail(); // Separate organizer
    fakeCommunity = createFakeCommunity();
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
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use cache-friendly test wrapper
    const testWrapper = createCacheTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;
  });

  it('should cache consolidated Resource objects and not refetch on subsequent calls', async () => {
    // Arrange: Mock the API functions
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(fakeOwner) // First call for resource owner
      .mockResolvedValueOnce(fakeOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act: First component calls useResource (simulates first component using the hook)
    const { result: firstResult } = renderHook(
      () => useResource(fakeResourceInfo.id),
      {
        wrapper,
      },
    );

    // Wait for first query to complete
    await waitFor(() => {
      expect(
        firstResult.current.isSuccess || firstResult.current.isError,
      ).toBeTruthy();
    });
    if (firstResult.current.isError) {
      throw firstResult.current.error;
    }

    // Verify first call results in consolidated Resource
    const firstResource = firstResult.current.data;
    expect(firstResource).toBeDefined();
    expect(firstResource!.owner).toEqual(fakeOwner);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerId, ...expectedCommunityInfo } = fakeCommunityInfo;
    expect(firstResource!.community).toEqual({
      ...expectedCommunityInfo,
      organizer: fakeOrganizer,
    });

    // Count API calls after first hook usage
    const initialResourceCalls = mockFetchResourceInfoById.mock.calls.length;
    const initialUserCalls = mockFetchUserById.mock.calls.length;
    const initialCommunityCalls = mockFetchCommunityById.mock.calls.length;

    // Act: Second component calls useResource with the same ID (simulates different component)
    const { result: secondResult } = renderHook(
      () => useResource(fakeResourceInfo.id),
      {
        wrapper, // Using same wrapper means same QueryClient instance
      },
    );

    // Wait for second query to complete (should be immediate due to cache)
    await waitFor(() => {
      expect(
        secondResult.current.isSuccess || secondResult.current.isError,
      ).toBeTruthy();
    });
    if (secondResult.current.isError) {
      throw secondResult.current.error;
    }

    // Assert: Second component gets same consolidated structure from cache
    const secondResource = secondResult.current.data;
    expect(secondResource).toBe(firstResource);

    // Assert: No API functions should be called again (cached at React Query level)
    expect(mockFetchResourceInfoById.mock.calls.length).toBe(
      initialResourceCalls,
    );
    expect(mockFetchUserById.mock.calls.length).toBe(initialUserCalls);
    expect(mockFetchCommunityById.mock.calls.length).toBe(
      initialCommunityCalls,
    );

    // Should have consolidated structure without ID references
    expect(secondResource).not.toHaveProperty('ownerId');
    expect(secondResource).not.toHaveProperty('communityId');
  });

  it('should use cached community data when building consolidated resource', async () => {
    // Arrange: Mock the API functions
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(fakeOwner) // First call for resource owner
      .mockResolvedValueOnce(fakeOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Pre-populate the community cache (simulating previous useCommunity call)
    queryClient.setQueryData(
      queryKeys.communities.byId(fakeResourceInfo.communityId),
      fakeCommunity,
    );

    // Act: Call useResource which should use the cached community
    const { result } = renderHook(() => useResource(fakeResourceInfo.id), {
      wrapper,
    });

    // Wait for query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }

    // Assert: Resource should be consolidated with cached community
    const resource = result.current.data;
    expect(resource).toBeDefined();
    expect(resource!.community).toBe(fakeCommunity);

    // Assert: Resource and User APIs should be called, but NOT Community API (cached)
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.ownerId,
    );
    expect(mockFetchCommunityById).not.toHaveBeenCalled(); // Should use cache
  });
});
