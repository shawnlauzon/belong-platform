import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJoinGathering } from '../../hooks/useJoinGathering';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeGatheringResponse } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api/joinGathering', () => ({
  joinGathering: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { joinGathering } from '../../api/joinGathering';
import { useCurrentUser } from '../../../auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockJoinGathering = vi.mocked(joinGathering);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useJoinGathering', () => {
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

  it('should join gathering with default attending status', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const fakeAttendance = createFakeGatheringResponse({
      gatheringId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinGathering.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinGathering(), { wrapper });
    const attendance = await result.current.mutateAsync({ gatheringId });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should join gathering with maybe status', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const fakeAttendance = createFakeGatheringResponse({
      gatheringId,
      userId: mockCurrentUser.id,
      status: 'maybe',
    });

    mockJoinGathering.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinGathering(), { wrapper });
    const attendance = await result.current.mutateAsync({
      gatheringId,
      status: 'maybe',
    });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'maybe',
    );
  });

  it('should join gathering with attending status explicitly', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const fakeAttendance = createFakeGatheringResponse({
      gatheringId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinGathering.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinGathering(), { wrapper });
    const attendance = await result.current.mutateAsync({
      gatheringId,
      status: 'attending',
    });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('Failed to join gathering');
    mockJoinGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinGathering(), { wrapper });

    await expect(result.current.mutateAsync({ gatheringId })).rejects.toThrow(
      'Failed to join gathering',
    );

    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should handle capacity errors', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error('Gathering has reached maximum capacity');
    mockJoinGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinGathering(), { wrapper });

    await expect(result.current.mutateAsync({ gatheringId })).rejects.toThrow(
      'Gathering has reached maximum capacity',
    );

    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should handle already joined error', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const error = new Error(
      'Already joined this gathering with the same status',
    );
    mockJoinGathering.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinGathering(), { wrapper });

    await expect(result.current.mutateAsync({ gatheringId })).rejects.toThrow(
      'Already joined this gathering with the same status',
    );

    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should return null when joinEvent returns null', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    mockJoinGathering.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useJoinGathering(), { wrapper });
    const attendance = await result.current.mutateAsync({ gatheringId });

    // Assert
    expect(attendance).toBeNull();
    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
  });

  it('should validate mutation parameters', async () => {
    // Arrange
    const gatheringId = 'test-event-id';
    const fakeAttendance = createFakeGatheringResponse({
      gatheringId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinGathering.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinGathering(), { wrapper });
    const attendance = await result.current.mutateAsync({
      gatheringId,
      status: 'attending',
    });

    // Assert: Should pass through the exact parameters
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinGathering).toHaveBeenCalledWith(
      mockSupabase,
      gatheringId,
      'attending',
    );
    expect(mockJoinGathering).toHaveBeenCalledTimes(1);
  });
});
