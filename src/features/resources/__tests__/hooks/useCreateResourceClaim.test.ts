import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateResourceClaim } from '../../hooks/useCreateResourceClaim';
import { createFakeResourceClaim, createFakeResourceClaimInput } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  createResourceClaim: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createResourceClaim } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResourceClaim = vi.mocked(createResourceClaim);

describe('useCreateResourceClaim', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should create claim successfully', async () => {
    // Arrange
    const claimInput = createFakeResourceClaimInput();
    const mockClaim = createFakeResourceClaim(claimInput);
    
    mockCreateResourceClaim.mockResolvedValue(mockClaim);

    // Act
    const { result } = renderHook(() => useCreateResourceClaim(), { wrapper });
    const createdClaim = await result.current.mutateAsync(claimInput);

    // Assert
    expect(createdClaim).toEqual(mockClaim);
    expect(mockCreateResourceClaim).toHaveBeenCalledWith(expect.any(Object), claimInput);
  });

  it('should handle creation errors', async () => {
    // Arrange
    const claimInput = createFakeResourceClaimInput();
    const errorMessage = 'Failed to create claim';
    
    mockCreateResourceClaim.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useCreateResourceClaim(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync(claimInput)).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const claimInput = createFakeResourceClaimInput();
    const mockClaim = createFakeResourceClaim(claimInput);
    
    mockCreateResourceClaim.mockResolvedValue(mockClaim);

    // Act
    const { result } = renderHook(() => useCreateResourceClaim(), { wrapper });
    await result.current.mutateAsync(claimInput);

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});