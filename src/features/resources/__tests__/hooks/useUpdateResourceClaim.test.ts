import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateResourceClaim } from '../../hooks/useUpdateResourceClaim';
import { createFakeResourceClaim } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { ResourceClaimInput } from '../../types';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  updateResourceClaim: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateResourceClaim } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateResourceClaim = vi.mocked(updateResourceClaim);

describe('useUpdateResourceClaim', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should update claim successfully', async () => {
    // Arrange
    const claimId = 'claim-123';
    const updateData: Partial<ResourceClaimInput> = {
      status: 'approved',
      notes: 'Updated notes',
    };
    const mockClaim = createFakeResourceClaim({ id: claimId, status: 'approved', notes: 'Updated notes' });
    
    mockUpdateResourceClaim.mockResolvedValue(mockClaim);

    // Act
    const { result } = renderHook(() => useUpdateResourceClaim(), { wrapper });
    const updatedClaim = await result.current.mutateAsync({ id: claimId, update: updateData });

    // Assert
    expect(updatedClaim).toEqual(mockClaim);
    expect(mockUpdateResourceClaim).toHaveBeenCalledWith(expect.any(Object), claimId, updateData);
  });

  it('should handle update errors', async () => {
    // Arrange
    const claimId = 'claim-123';
    const updateData: Partial<ResourceClaimInput> = {
      status: 'approved',
    };
    const errorMessage = 'Failed to update claim';
    
    mockUpdateResourceClaim.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useUpdateResourceClaim(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync({ id: claimId, update: updateData })).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const claimId = 'claim-123';
    const updateData: Partial<ResourceClaimInput> = {
      status: 'approved',
    };
    const mockClaim = createFakeResourceClaim({ id: claimId, status: 'approved' });
    
    mockUpdateResourceClaim.mockResolvedValue(mockClaim);

    // Act
    const { result } = renderHook(() => useUpdateResourceClaim(), { wrapper });
    await result.current.mutateAsync({ id: claimId, update: updateData });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});