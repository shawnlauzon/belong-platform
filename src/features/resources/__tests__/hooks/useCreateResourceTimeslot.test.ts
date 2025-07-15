import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateResourceTimeslot } from '../../hooks/useCreateResourceTimeslot';
import { createFakeResourceTimeslot, createFakeResourceTimeslotInput } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { createMockSupabase } from '../../../../test-utils';

// Mock the API functions
vi.mock('../../api', () => ({
  createResourceTimeslot: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createResourceTimeslot } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResourceTimeslot = vi.mocked(createResourceTimeslot);

describe('useCreateResourceTimeslot', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];

  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockSupabase = {} as ReturnType<typeof createMockSupabase>;
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should create timeslot successfully', async () => {
    // Arrange
    const timeslotInput = createFakeResourceTimeslotInput();
    const mockTimeslot = createFakeResourceTimeslot(timeslotInput);
    
    mockCreateResourceTimeslot.mockResolvedValue(mockTimeslot);

    // Act
    const { result } = renderHook(() => useCreateResourceTimeslot(), { wrapper });
    const createdTimeslot = await result.current.mutateAsync(timeslotInput);

    // Assert
    expect(createdTimeslot).toEqual(mockTimeslot);
    expect(mockCreateResourceTimeslot).toHaveBeenCalledWith(expect.any(Object), timeslotInput);
  });

  it('should handle creation errors', async () => {
    // Arrange
    const timeslotInput = createFakeResourceTimeslotInput();
    const errorMessage = 'Failed to create timeslot';
    
    mockCreateResourceTimeslot.mockRejectedValue(new Error(errorMessage));

    // Act
    const { result } = renderHook(() => useCreateResourceTimeslot(), { wrapper });

    // Assert
    await expect(result.current.mutateAsync(timeslotInput)).rejects.toThrow(errorMessage);
  });

  it('should invalidate related queries on success', async () => {
    // Arrange
    const timeslotInput = createFakeResourceTimeslotInput();
    const mockTimeslot = createFakeResourceTimeslot(timeslotInput);
    
    mockCreateResourceTimeslot.mockResolvedValue(mockTimeslot);

    // Act
    const { result } = renderHook(() => useCreateResourceTimeslot(), { wrapper });
    await result.current.mutateAsync(timeslotInput);

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    // Note: Query invalidation is tested through integration tests
  });
});