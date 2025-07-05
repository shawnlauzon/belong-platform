import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResource } from '../../hooks/useResource';
import { createMockSupabase } from '../../../../test-utils';
import { createMockResourceInfo } from '../../__mocks__/';
import { createMockUser } from '../../../users/__mocks__';
import { createMockCommunity } from '../../../communities/__mocks__';
import { createDefaultTestWrapper } from '../../../../shared/__tests__/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import type { Community, CommunityInfo } from '../../../communities/types';

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
  let mockResourceInfo: ReturnType<typeof createMockResourceInfo>;
  let mockOwner: User;
  let mockOrganizer: User;
  let mockCommunity: Community;
  let mockCommunityInfo: CommunityInfo;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockOwner = createMockUser();
    mockOrganizer = createMockUser(); // Separate organizer
    mockCommunity = createMockCommunity();
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
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper and get queryClient for cache testing
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
  });

  it('should return a full Resource object composed from ResourceInfo + User + Community', async () => {
    // Arrange: Mock the API functions - let's start simple
    mockFetchResourceInfoById.mockResolvedValue(mockResourceInfo);
    mockFetchUserById
      .mockResolvedValueOnce(mockOwner) // First call for resource owner
      .mockResolvedValueOnce(mockOrganizer); // Second call for community organizer
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useResource(mockResourceInfo.id), {
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
    const { organizerId, ...communityInfoWithoutId } = mockCommunityInfo;
    const expectedCommunity = {
      ...communityInfoWithoutId,
      organizer: mockOrganizer,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ownerId, communityId, ...resourceInfoWithoutIds } =
      mockResourceInfo;
    expect(resource).toEqual(
      expect.objectContaining({
        ...resourceInfoWithoutIds,
        owner: mockOwner, // Full User object, not just ID
        community: expectedCommunity, // Full Community object with organizer
      }),
    );

    // Should NOT have ID references (ResourceInfo pattern)
    expect(resource).not.toHaveProperty('ownerId');
    expect(resource).not.toHaveProperty('communityId');

    // Verify API functions were called correctly
    expect(mockFetchResourceInfoById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.ownerId,
    );
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.communityId,
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
    mockFetchResourceInfoById.mockResolvedValue(mockResourceInfo);
    mockFetchUserById.mockResolvedValue(null); // Owner not found
    mockFetchCommunityById.mockResolvedValue(mockCommunityInfo);

    // Act
    const { result } = renderHook(() => useResource(mockResourceInfo.id), {
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
