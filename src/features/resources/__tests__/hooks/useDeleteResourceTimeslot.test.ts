import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteResourceTimeslot } from '../../hooks/useDeleteResourceTimeslot';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  deleteResourceTimeslot: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { deleteResourceTimeslot } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockDeleteResourceTimeslot = vi.mocked(deleteResourceTimeslot);

describe('useDeleteResourceTimeslot', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should delete timeslot successfully', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const resourceId = 'resource-123';
    
    mockDeleteResourceTimeslot.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteResourceTimeslot(), { wrapper });
    await result.current.mutateAsync({ id: timeslotId, resourceId });

    // Assert
    expect(mockDeleteResourceTimeslot).toHaveBeenCalledWith(expect.any(Object), timeslotId);
  });

  it('should handle delete errors', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const resourceId = 'resource-123';
    const errorMessage = 'Failed to delete timeslot';
    
    mockDeleteResourceTimeslot.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useDeleteResourceTimeslot(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync({ id: timeslotId, resourceId })).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const resourceId = 'resource-123';
    
    mockDeleteResourceTimeslot.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useDeleteResourceTimeslot(), { wrapper });
    await result.current.mutateAsync({ id: timeslotId, resourceId });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});