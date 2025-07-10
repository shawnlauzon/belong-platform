import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useJoinEvent } from '../../hooks/useJoinEvent';
import { createMockSupabase } from '../../../../test-utils';
import {
  createFakeEventAttendanceInfo,
} from '../../__fakes__';
import { createFakeUserDetail } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../api/joinEvent', () => ({
  joinEvent: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { joinEvent } from '../../api/joinEvent';
import { useCurrentUser } from '../../../auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { UserDetail } from '../../../users/types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockJoinEvent = vi.mocked(joinEvent);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useJoinEvent', () => {
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

  it('should join event with default attending status', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const fakeAttendance = createFakeEventAttendanceInfo({
      eventId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinEvent.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinEvent(), { wrapper });
    const attendance = await result.current.mutateAsync({ eventId });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should join event with maybe status', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const fakeAttendance = createFakeEventAttendanceInfo({
      eventId,
      userId: mockCurrentUser.id,
      status: 'maybe',
    });

    mockJoinEvent.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinEvent(), { wrapper });
    const attendance = await result.current.mutateAsync({ 
      eventId, 
      status: 'maybe' 
    });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'maybe');
  });

  it('should join event with attending status explicitly', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const fakeAttendance = createFakeEventAttendanceInfo({
      eventId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinEvent.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinEvent(), { wrapper });
    const attendance = await result.current.mutateAsync({ 
      eventId, 
      status: 'attending' 
    });

    // Assert
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Failed to join event');
    mockJoinEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinEvent(), { wrapper });

    await expect(
      result.current.mutateAsync({ eventId })
    ).rejects.toThrow('Failed to join event');
    
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should handle capacity errors', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Event has reached maximum capacity');
    mockJoinEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinEvent(), { wrapper });

    await expect(
      result.current.mutateAsync({ eventId })
    ).rejects.toThrow('Event has reached maximum capacity');
    
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should handle already joined error', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const error = new Error('Already joined this event with the same status');
    mockJoinEvent.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useJoinEvent(), { wrapper });

    await expect(
      result.current.mutateAsync({ eventId })
    ).rejects.toThrow('Already joined this event with the same status');
    
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should return null when joinEvent returns null', async () => {
    // Arrange
    const eventId = 'test-event-id';
    mockJoinEvent.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useJoinEvent(), { wrapper });
    const attendance = await result.current.mutateAsync({ eventId });

    // Assert
    expect(attendance).toBeNull();
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
  });

  it('should validate mutation parameters', async () => {
    // Arrange
    const eventId = 'test-event-id';
    const fakeAttendance = createFakeEventAttendanceInfo({
      eventId,
      userId: mockCurrentUser.id,
      status: 'attending',
    });

    mockJoinEvent.mockResolvedValue(fakeAttendance);

    // Act
    const { result } = renderHook(() => useJoinEvent(), { wrapper });
    const attendance = await result.current.mutateAsync({ 
      eventId, 
      status: 'attending' 
    });

    // Assert: Should pass through the exact parameters
    expect(attendance).toEqual(fakeAttendance);
    expect(mockJoinEvent).toHaveBeenCalledWith(mockSupabase, eventId, 'attending');
    expect(mockJoinEvent).toHaveBeenCalledTimes(1);
  });
});