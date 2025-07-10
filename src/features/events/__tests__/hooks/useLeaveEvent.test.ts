import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLeaveEvent } from '../../hooks/useLeaveEvent';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeUserDetail } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api/leaveEvent', () => ({
  leaveEvent: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { leaveEvent } from '../../api/leaveEvent';
import { useCurrentUser } from '../../../auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { UserDetail } from '../../../users/types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockLeaveEvent = vi.mocked(leaveEvent);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useLeaveEvent', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockCurrentUser: UserDetail;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockCurrentUser = createFakeUserDetail();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);
    mockUseCurrentUser.mockReturnValue({
      data: mockCurrentUser,
    } as ReturnType<typeof useCurrentUser>);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should leave event successfully', async () => {
    // Arrange
    const eventId = 'test-event-id';
    mockLeaveEvent.mockResolvedValue();

    // Act
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });
    const leaveResult = await result.current.mutateAsync(eventId);

    // Assert
    expect(leaveResult).toBeUndefined(); // leaveEvent returns void
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
    expect(mockLeaveEvent).toHaveBeenCalledTimes(1);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Failed to leave event');
    mockLeaveEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });

    await expect(
      result.current.mutateAsync(eventId)
    ).rejects.toThrow('Failed to leave event');
    
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });

  it('should handle database errors', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Database connection failed');
    mockLeaveEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });

    await expect(
      result.current.mutateAsync(eventId)
    ).rejects.toThrow('Database connection failed');
    
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });

  it('should handle non-existent event gracefully', async () => {
    // Arrange
    const eventId = 'non-existent-event-id';
    const error = new Error('Event not found');
    mockLeaveEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });

    await expect(
      result.current.mutateAsync(eventId)
    ).rejects.toThrow('Event not found');
    
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });

  it('should handle authentication errors', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('User must be authenticated');
    mockLeaveEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });

    await expect(
      result.current.mutateAsync(eventId)
    ).rejects.toThrow('User must be authenticated');
    
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });

  it('should handle already left event scenario', async () => {
    // Arrange - Leaving an event you're not attending should still succeed
    const eventId = 'test-event-id';
    mockLeaveEvent.mockResolvedValue(); // API handles this gracefully

    // Act
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });
    const leaveResult = await result.current.mutateAsync(eventId);

    // Assert - Should succeed even if user wasn't attending
    expect(leaveResult).toBeUndefined();
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });

  it('should validate eventId parameter', async () => {
    // Arrange
    const eventId = 'valid-event-id';
    mockLeaveEvent.mockResolvedValue();

    // Act
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });
    await result.current.mutateAsync(eventId);

    // Assert: Should pass through the exact eventId
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
    expect(mockLeaveEvent).toHaveBeenCalledTimes(1);
  });

  it('should handle permission errors', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Permission denied');
    mockLeaveEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useLeaveEvent(), { wrapper });

    await expect(
      result.current.mutateAsync(eventId)
    ).rejects.toThrow('Permission denied');
    
    expect(mockLeaveEvent).toHaveBeenCalledWith(mockSupabase, eventId);
  });
});