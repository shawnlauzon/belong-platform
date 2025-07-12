import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResources } from '../../hooks/useResources';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  fetchResources: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchResources } from '../../api';
import { ResourceFilter } from '../../types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResources = vi.mocked(fetchResources);

describe('useResources', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return ResourceInfo[] from fetchResources', async () => {
    // Arrange: Mock return value should be ResourceInfo[]
    const fakeResourceInfos = [
      createFakeResource(),
      createFakeResource(),
    ];

    mockFetchResources.mockResolvedValue(fakeResourceInfos);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(fakeResourceInfos);
    });

    expect(mockFetchResources).toHaveBeenCalledWith(mockSupabase, undefined);

    // Verify the returned data has full Resource objects with relations
    const resource = result.current.data![0];
    expect(typeof resource.ownerId).toBe('string');
    expect(typeof resource.communityId).toBe('string');
    expect(resource).toHaveProperty('owner');
  });

  it('should pass filters to fetchResources', async () => {
    // Arrange
    const filters: ResourceFilter = {
      communityId: 'test-community-id',
      type: 'offer',
    };
    const fakeResourceInfos = [createFakeResource()];
    mockFetchResources.mockResolvedValue(fakeResourceInfos);

    // Act
    const { result } = renderHook(() => useResources(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual(fakeResourceInfos);
    });

    expect(mockFetchResources).toHaveBeenCalledWith(mockSupabase, filters);
  });

  it('should return empty array when no resources exist', async () => {
    // Arrange
    mockFetchResources.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });

    expect(mockFetchResources).toHaveBeenCalledWith(mockSupabase, undefined);
  });

  it('should handle errors gracefully and return error state', async () => {
    // Arrange
    const error = new Error('Failed to fetch resources');
    mockFetchResources.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useResources(), { wrapper });

    // Assert - Should return error state
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
    expect(mockFetchResources).toHaveBeenCalledWith(mockSupabase, undefined);
  });
});
