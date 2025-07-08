import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResource } from '../../hooks/useResource';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResourceInfo } from '../../__fakes__/';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { UserDetail } from '../../../users/types';
import type {
  CommunityDetail,
  CommunityInfo,
} from '../../../communities/types';

// Global mocks for shared and config modules are now handled in vitest.setup.ts
// This eliminates redundant mock definitions across test files

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

import { useSupabase } from '../../../../shared';
import { fetchResourceInfoById } from '../../api/fetchResourceInfoById';
import { fetchUserById } from '../../../users/api/fetchUserById';
import { fetchCommunityById } from '../../../communities/api/fetchCommunityById';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceInfoById = vi.mocked(fetchResourceInfoById);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockFetchCommunityById = vi.mocked(fetchCommunityById);

describe('useResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeResourceInfo: ReturnType<typeof createFakeResourceInfo>;
  let fakeOwner: UserDetail;
  let fakeOrganizer: UserDetail;
  let fakeCommunity: CommunityDetail;
  let fakeCommunityInfo: CommunityInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeOwner = createFakeUser();
    fakeOrganizer = createFakeUser(); // Separate organizer
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

    // Use shared test wrapper and get queryClient for cache testing
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
  });

  it('should return a full Resource object composed from ResourceInfo + User + Community', async () => {
    // Arrange: Mock the API functions - let's start simple
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(fakeOwner) // First call for resource owner
      .mockResolvedValueOnce(fakeOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act
    const { result } = renderHook(() => useResource(fakeResourceInfo.id), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    const resource = result.current.data;

    // Assert: Should return full Resource object, not ResourceInfo

    // Expected community with the organizer
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizerId, ...communityInfoWithoutId } = fakeCommunityInfo;
    const expectedCommunity = {
      ...communityInfoWithoutId,
      organizer: fakeOrganizer,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ownerId, communityId, ...resourceInfoWithoutIds } =
      fakeResourceInfo;
    expect(resource).toEqual(
      expect.objectContaining({
        ...resourceInfoWithoutIds,
        owner: fakeOwner, // Full User object, not just ID
        community: expectedCommunity, // Full Community object with organizer
      }),
    );

    // Should NOT have ID references (ResourceInfo pattern)
    expect(resource).not.toHaveProperty('ownerId');
    expect(resource).not.toHaveProperty('communityId');

    // Verify API functions were called correctly
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.ownerId,
    );
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResourceInfo.communityId,
    );
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    mockFetchResourceInfoById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useResource('nonexistent-id'), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    // Assert
    expect(result.current.data).toBeNull();
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
  });

  it('should return null when owner is not found', async () => {
    // Arrange
    mockFetchResourceInfoById.mockResolvedValue(fakeResourceInfo);
    mockFetchUserById.mockResolvedValue(null); // Owner not found
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);

    // Act
    const { result } = renderHook(() => useResource(fakeResourceInfo.id), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
    // Assert: Should return null if required owner data is missing
    expect(result.current.data).toBeNull();
  });
});
