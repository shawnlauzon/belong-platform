import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteResource } from '../../hooks/useDeleteResource';
import { createMockSupabase } from '../../../../test-utils';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  deleteResource: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { deleteResource } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockDeleteResource = vi.mocked(deleteResource);

describe('useDeleteResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let queryClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;

    // Spy on queryClient methods
    vi.spyOn(queryClient, 'removeQueries');
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('should delete resource and invalidate cache on success', async () => {
    // Arrange
    const resourceId = 'resource-123';
    mockDeleteResource.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteResource(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync(resourceId);
    });

    // Assert
    expect(mockDeleteResource).toHaveBeenCalledWith(mockSupabase, resourceId);
  });

  it('should handle deletion errors', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const error = new Error('Failed to delete resource');
    mockDeleteResource.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteResource(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync(resourceId)).rejects.toThrow(
      'Failed to delete resource',
    );

    expect(mockDeleteResource).toHaveBeenCalledWith(mockSupabase, resourceId);

    // Cache should not be invalidated on error
    expect(queryClient.removeQueries).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
