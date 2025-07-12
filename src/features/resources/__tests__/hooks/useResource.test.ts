import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResource } from '../../hooks/useResource';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource } from '../../__fakes__/';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import type { Community } from '../../../communities/types';

// Global mocks for shared and config modules are now handled in vitest.setup.ts
// This eliminates redundant mock definitions across test files

// Mock the API functions at the lowest level
vi.mock('../../api/fetchResourceInfoById', () => ({
  fetchResourceById: vi.fn(),
}));

vi.mock('../../../users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

vi.mock('../../../communities/api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchResourceById } from '../../api/fetchResourceInfoById';
import { fetchUserById } from '../../../users/api/fetchUserById';
import { fetchCommunityById } from '../../../communities/api/fetchCommunityById';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceById = vi.mocked(fetchResourceById);
const mockFetchUserById = vi.mocked(fetchUserById);
const mockFetchCommunityById = vi.mocked(fetchCommunityById);

describe('useResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let fakeResource: ReturnType<typeof createFakeResource>;
  let fakeOwner: User;
  let fakeOrganizer: User;
  let fakeCommunity: Community;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    fakeOwner = createFakeUser();
    fakeOrganizer = createFakeUser(); // Separate organizer
    fakeCommunity = createFakeCommunity();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizer, ...rest } = fakeCommunity;
    fakeCommunity = {
      ...rest,
      organizerId: fakeOrganizer.id,
    };

    fakeResource = createFakeResource({
      ownerId: fakeOwner.id,
      communityId: fakeCommunity.id,
    });

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper and get queryClient for cache testing
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
  });

  it('should return a full Resource object from API', async () => {
    // Arrange: Mock the API function - it now fetches everything in one call
    mockFetchResourceById.mockResolvedValue(fakeResource);

    // Act
    const { result } = renderHook(() => useResource(fakeResource.id), {
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

    // Assert: Should return the resource as fetched from API
    expect(resource).toEqual(fakeResource);

    // Should have ID references as part of the new type system
    expect(resource).toHaveProperty('ownerId', fakeResource.ownerId);
    expect(resource).toHaveProperty('communityId', fakeResource.communityId);

    // Verify the API call was made
    expect(mockFetchResourceById).toHaveBeenCalledWith(
      mockSupabase,
      fakeResource.id,
    );
    // No longer makes separate calls for user and community
    expect(mockFetchUserById).not.toHaveBeenCalled();
    expect(mockFetchCommunityById).not.toHaveBeenCalled();
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    mockFetchResourceById.mockResolvedValue(null);

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
    expect(mockFetchResourceById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
  });

  it('should return null when resource is not found', async () => {
    // Arrange - API returns null for non-existent resources
    mockFetchResourceById.mockResolvedValue(null);

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
    // Assert: Should return null for non-existent resource
    expect(result.current.data).toBeNull();
  });
});
