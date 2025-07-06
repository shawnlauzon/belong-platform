import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteUser } from '../../hooks/useDeleteUser';
import { createMockSupabase } from '../../../../test-utils';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  deleteUser: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { deleteUser } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockDeleteUser = vi.mocked(deleteUser);

describe('useDeleteUser', () => {
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

  it('should delete user and invalidate cache on success', async () => {
    // Arrange
    const userId = 'user-123';
    mockDeleteUser.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync(userId);
    });

    // Assert
    expect(mockDeleteUser).toHaveBeenCalledWith(mockSupabase, userId);
  });

  it('should handle deletion errors', async () => {
    // Arrange
    const userId = 'user-123';
    const error = new Error('Failed to delete user');
    mockDeleteUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useDeleteUser(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync(userId)).rejects.toThrow(
      'Failed to delete user',
    );

    expect(mockDeleteUser).toHaveBeenCalledWith(mockSupabase, userId);

    // Cache should not be invalidated on error
    expect(queryClient.removeQueries).not.toHaveBeenCalled();
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});
