import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResourceClaims } from '../../hooks/useResourceClaims';
import { createFakeResourceClaim } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  fetchResourceClaims: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchResourceClaims } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceClaims = vi.mocked(fetchResourceClaims);

describe('useResourceClaims', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should fetch resource claims successfully', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const mockClaims = [
      createFakeResourceClaim({ resourceId }),
      createFakeResourceClaim({ resourceId }),
    ];
    
    mockFetchResourceClaims.mockResolvedValue(mockClaims);

    // Act
    const { result } = renderHook(() => useResourceClaims({ resourceId }), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockClaims);
    expect(mockFetchResourceClaims).toHaveBeenCalledWith(expect.any(Object), { resourceId });
  });

  it('should handle fetch errors', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const errorMessage = 'Failed to fetch claims';
    
    mockFetchResourceClaims.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useResourceClaims({ resourceId }), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it('should return empty array when no claims exist', async () => {
    // Arrange
    const resourceId = 'resource-123';
    
    mockFetchResourceClaims.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useResourceClaims({ resourceId }), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should not fetch when no filter is provided', async () => {
    // Arrange
    const filter = {};

    // Act
    const { result } = renderHook(() => useResourceClaims(filter), { wrapper });

    // Assert - When disabled, the query should not be fetched
    expect(mockFetchResourceClaims).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});