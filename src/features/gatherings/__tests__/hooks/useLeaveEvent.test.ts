import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaveGathering } from '../../hooks/useLeaveGathering';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeUser } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api/leaveGathering', () => ({
  leaveGathering: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { leaveGathering } from '../../api/leaveGathering';
import { useCurrentUser } from '../../../auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockLeaveGathering = vi.mocked(leaveGathering);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useLeaveGathering', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockCurrentUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockCurrentUser = createFakeUser();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);
    mockUseCurrentUser.mockReturnValue({
      data: mockCurrentUser,
    } as ReturnType<typeof useCurrentUser>);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should leave gathering successfully', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    mockLeaveGathering.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });
    const leaveResult = await result.current.mutateAsync(gatheringId);

    // Assert
    expect(leaveResult).toBeUndefined(); // leaveGathering returns void
    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
    expect(mockLeaveGathering).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('Failed to leave gathering');
    mockLeaveGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });

    await expect(result.current.mutateAsync(gatheringId)).rejects.toThrow(
      'Failed to leave gathering',
    );

    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });

  it('should handle database errors', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('Database connection failed');
    mockLeaveGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });

    await expect(result.current.mutateAsync(gatheringId)).rejects.toThrow(
      'Database connection failed',
    );

    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });

  it('should handle non-existent event gracefully', async () => {
    // Arrange
    const gatheringId = 'non-existent-event-id';
    const error = new Error('Gathering not found');
    mockLeaveGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });

    await expect(result.current.mutateAsync(gatheringId)).rejects.toThrow(
      'Gathering not found',
    );

    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });

  it('should handle authentication errors', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('User must be authenticated');
    mockLeaveGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });

    await expect(result.current.mutateAsync(gatheringId)).rejects.toThrow(
      'User must be authenticated',
    );

    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });

  it('should handle already left event scenario', async () => {
    // Arrange - Leaving a gathering you're not attending should still succeed
    const gatheringId = 'test-event-id';
    mockLeaveGathering.mockResolvedValue(null); // API handles this gracefully

    // Act
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });
    const leaveResult = await result.current.mutateAsync(gatheringId);

    // Assert - Should succeed even if user wasn't attending
    expect(leaveResult).toBeUndefined();
    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });

  it('should validate gatheringId parameter', async () => {
    // Arrange
    const gatheringId = 'valid-event-id';
    mockLeaveGathering.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });
    await result.current.mutateAsync(gatheringId);

    // Assert: Should pass through the exact gatheringId
    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
    expect(mockLeaveGathering).toHaveBeenCalledTimes(1);
  });

  it('should handle permission errors', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('Permission denied');
    mockLeaveGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveGathering(), { wrapper });

    await expect(result.current.mutateAsync(gatheringId)).rejects.toThrow(
      'Permission denied',
    );

    expect(mockLeaveGathering).toHaveBeenCalledWith(mockSupabase, gatheringId);
  });
});
