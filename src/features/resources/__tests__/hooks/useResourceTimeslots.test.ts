import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResourceTimeslots } from '../../hooks/useResourceTimeslots';
import { createFakeResourceTimeslot } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  fetchResourceTimeslots: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchResourceTimeslots } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceTimeslots = vi.mocked(fetchResourceTimeslots);

describe('useResourceTimeslots', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should fetch resource timeslots successfully', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const mockTimeslots = [
      createFakeResourceTimeslot({ resourceId }),
      createFakeResourceTimeslot({ resourceId }),
    ];
    
    mockFetchResourceTimeslots.mockResolvedValue(mockTimeslots);

    // Act
    const { result } = renderHook(() => useResourceTimeslots(resourceId), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTimeslots);
    expect(mockFetchResourceTimeslots).toHaveBeenCalledWith(expect.any(Object), resourceId);
  });

  it('should handle fetch errors', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const errorMessage = 'Failed to fetch timeslots';
    
    mockFetchResourceTimeslots.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useResourceTimeslots(resourceId), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(new Error(errorMessage));
  });

  it('should return empty array when no timeslots exist', async () => {
    // Arrange
    const resourceId = 'resource-123';
    
    mockFetchResourceTimeslots.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useResourceTimeslots(resourceId), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should not fetch when resourceId is not provided', async () => {
    // Arrange
    const resourceId = '';

    // Act
    const { result } = renderHook(() => useResourceTimeslots(resourceId), { wrapper });

    // Assert - When disabled, the query should not be fetched
    expect(mockFetchResourceTimeslots).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });
});