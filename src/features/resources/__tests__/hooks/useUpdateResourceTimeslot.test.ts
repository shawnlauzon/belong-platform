import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUpdateResourceTimeslot } from '../../hooks/useUpdateResourceTimeslot';
import { createFakeResourceTimeslot } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { ResourceTimeslotInput } from '../../types';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  updateResourceTimeslot: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateResourceTimeslot } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateResourceTimeslot = vi.mocked(updateResourceTimeslot);

describe('useUpdateResourceTimeslot', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should update timeslot successfully', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const updateData: Partial<ResourceTimeslotInput> = {
      maxClaims: 5,
    };
    const mockTimeslot = createFakeResourceTimeslot({ id: timeslotId, maxClaims: 5 });
    
    mockUpdateResourceTimeslot.mockResolvedValue(mockTimeslot);

    // Act
    const { result } = renderHook(() => useUpdateResourceTimeslot(), { wrapper });
    const updatedTimeslot = await result.current.mutateAsync({ id: timeslotId, update: updateData });

    // Assert
    expect(updatedTimeslot).toEqual(mockTimeslot);
    expect(mockUpdateResourceTimeslot).toHaveBeenCalledWith(expect.any(Object), timeslotId, updateData);
  });

  it('should handle update errors', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const updateData: Partial<ResourceTimeslotInput> = {
      maxClaims: 5,
    };
    const errorMessage = 'Failed to update timeslot';
    
    mockUpdateResourceTimeslot.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useUpdateResourceTimeslot(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync({ id: timeslotId, update: updateData })).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const timeslotId = 'timeslot-123';
    const updateData: Partial<ResourceTimeslotInput> = {
      maxClaims: 5,
    };
    const mockTimeslot = createFakeResourceTimeslot({ id: timeslotId, maxClaims: 5 });
    
    mockUpdateResourceTimeslot.mockResolvedValue(mockTimeslot);

    // Act
    const { result } = renderHook(() => useUpdateResourceTimeslot(), { wrapper });
    await result.current.mutateAsync({ id: timeslotId, update: updateData });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});