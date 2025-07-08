import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventAttendees } from '../../hooks/useEventAttendees';
import { createTestWrapper } from '../../../../test-utils';
import { createFakeEventAttendance } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import type { EventAttendance } from '../../types';

// Mock the API function
vi.mock('../../api/fetchEventAttendees', () => ({
  fetchEventAttendees: vi.fn(),
}));

import { fetchEventAttendees } from '../../api/fetchEventAttendees';
const mockFetchEventAttendees = vi.mocked(fetchEventAttendees);

describe('useEventAttendees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch event attendees successfully', async () => {
    const eventId = 'test-event-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();
    
    const fakeAttendances: EventAttendance[] = [
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser1.id, 
        status: 'attending',
        user: fakeUser1 
      }),
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser2.id, 
        status: 'maybe',
        user: fakeUser2 
      }),
    ];

    mockFetchEventAttendees.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(eventId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeAttendances);
    expect(mockFetchEventAttendees).toHaveBeenCalledWith(expect.any(Object), eventId);
  });

  it('should handle different attendance statuses', async () => {
    const eventId = 'test-event-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();
    const fakeUser3 = createFakeUser();
    
    const fakeAttendances: EventAttendance[] = [
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser1.id, 
        status: 'attending',
        user: fakeUser1 
      }),
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser2.id, 
        status: 'maybe',
        user: fakeUser2 
      }),
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser3.id, 
        status: 'not_attending',
        user: fakeUser3 
      }),
    ];

    mockFetchEventAttendees.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(eventId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeAttendances);
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.[0].status).toBe('attending');
    expect(result.current.data?.[1].status).toBe('maybe');
    expect(result.current.data?.[2].status).toBe('not_attending');
  });

  it('should handle empty attendees list', async () => {
    const eventId = 'test-event-id';
    const fakeAttendances: EventAttendance[] = [];

    mockFetchEventAttendees.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(eventId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
    expect(mockFetchEventAttendees).toHaveBeenCalledWith(expect.any(Object), eventId);
  });

  it('should handle fetch errors', async () => {
    const eventId = 'test-event-id';
    const error = new Error('Failed to fetch event attendees');
    mockFetchEventAttendees.mockRejectedValue(error);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(eventId), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should not fetch when eventId is empty', async () => {
    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(''), { wrapper });

    // Should not call the API when eventId is empty
    expect(mockFetchEventAttendees).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should include user data in each attendance record', async () => {
    const eventId = 'test-event-id';
    const fakeUser = createFakeUser();
    
    const fakeAttendances: EventAttendance[] = [
      createFakeEventAttendance({ 
        eventId, 
        userId: fakeUser.id, 
        status: 'attending',
        user: fakeUser 
      }),
    ];

    mockFetchEventAttendees.mockResolvedValue(fakeAttendances);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEventAttendees(eventId), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].user).toEqual(fakeUser);
    expect(result.current.data?.[0].userId).toBe(fakeUser.id);
    expect(result.current.data?.[0].eventId).toBe(eventId);
    expect(result.current.data?.[0].status).toBe('attending');
  });
});