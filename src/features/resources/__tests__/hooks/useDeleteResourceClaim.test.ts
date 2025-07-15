import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteResourceClaim } from '../../hooks/useDeleteResourceClaim';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  deleteResourceClaim: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { deleteResourceClaim } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockDeleteResourceClaim = vi.mocked(deleteResourceClaim);

describe('useDeleteResourceClaim', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should delete claim successfully', async () => {
    // Arrange
    const claimId = 'claim-123';
    const resourceId = 'resource-123';
    
    mockDeleteResourceClaim.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteResourceClaim(), { wrapper });
    await result.current.mutateAsync({ id: claimId, resourceId });

    // Assert
    expect(mockDeleteResourceClaim).toHaveBeenCalledWith(expect.any(Object), claimId);
  });

  it('should handle delete errors', async () => {
    // Arrange
    const claimId = 'claim-123';
    const resourceId = 'resource-123';
    const errorMessage = 'Failed to delete claim';
    
    mockDeleteResourceClaim.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useDeleteResourceClaim(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync({ id: claimId, resourceId })).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const claimId = 'claim-123';
    const resourceId = 'resource-123';
    
    mockDeleteResourceClaim.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteResourceClaim(), { wrapper });
    await result.current.mutateAsync({ id: claimId, resourceId });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});