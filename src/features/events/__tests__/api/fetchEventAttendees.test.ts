import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEventAttendees } from '../../api/fetchEventAttendees';
import { createFakeEventAttendanceRow } from '../../__fakes__';
import { createFakeUserDetail } from '../../../users/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the user API function
vi.mock('../../../users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

import { fetchUserById } from '../../../users/api/fetchUserById';
const mockFetchUserById = vi.mocked(fetchUserById);

describe('fetchEventAttendees', () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it('should fetch event attendees with user data successfully', async () => {
    const eventId = 'test-event-id';
    const fakeUser1 = createFakeUserDetail();
    const fakeUser2 = createFakeUserDetail();

    const fakeAttendanceRows = [
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser1.id,
        status: 'attending',
      }),
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser2.id,
        status: 'maybe',
      }),
    ];

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: fakeAttendanceRows,
      error: null,
    });

    mockFetchUserById
      .mockResolvedValueOnce(fakeUser1)
      .mockResolvedValueOnce(fakeUser2);

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      eventId,
      userId: fakeUser1.id,
      status: 'attending',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      user: fakeUser1,
    });
    expect(result[1]).toEqual({
      eventId,
      userId: fakeUser2.id,
      status: 'maybe',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      user: fakeUser2,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('event_attendances');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('event_id', eventId);
    expect(mockFetchUserById).toHaveBeenCalledTimes(2);
  });

  it('should handle different attendance statuses', async () => {
    const eventId = 'test-event-id';
    const fakeUser1 = createFakeUserDetail();
    const fakeUser2 = createFakeUserDetail();
    const fakeUser3 = createFakeUserDetail();

    const fakeAttendanceRows = [
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser1.id,
        status: 'attending',
      }),
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser2.id,
        status: 'maybe',
      }),
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser3.id,
        status: 'not_attending',
      }),
    ];

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: fakeAttendanceRows,
      error: null,
    });

    mockFetchUserById
      .mockResolvedValueOnce(fakeUser1)
      .mockResolvedValueOnce(fakeUser2)
      .mockResolvedValueOnce(fakeUser3);

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('attending');
    expect(result[1].status).toBe('maybe');
    expect(result[2].status).toBe('not_attending');
  });

  it('should handle empty attendees list', async () => {
    const eventId = 'test-event-id';

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toEqual([]);
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const eventId = 'test-event-id';
    const error = new Error('Database error');

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: null,
      error,
    });

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toEqual([]);
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should filter out null user results', async () => {
    const eventId = 'test-event-id';
    const fakeUser = createFakeUserDetail();

    const fakeAttendanceRows = [
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: fakeUser.id,
        status: 'attending',
      }),
      createFakeEventAttendanceRow({
        event_id: eventId,
        user_id: 'nonexistent-user',
        status: 'maybe',
      }),
    ];

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: fakeAttendanceRows,
      error: null,
    });

    mockFetchUserById
      .mockResolvedValueOnce(fakeUser)
      .mockResolvedValueOnce(null); // User not found

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toHaveLength(1);
    expect(result[0].userId).toEqual(fakeUser.id);
    expect(mockFetchUserById).toHaveBeenCalledTimes(2);
  });

  it('should return EventAttendanceInfo objects with proper structure', async () => {
    const eventId = 'test-event-id';
    const fakeUser = createFakeUserDetail();

    const fakeAttendanceRow = createFakeEventAttendanceRow({
      event_id: eventId,
      user_id: fakeUser.id,
      status: 'attending',
    });

    // Mock the query chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn();
    const mockQuery = {
      select: mockSelect,
      eq: mockEq,
    };

    mockSupabase.from = vi.fn().mockReturnValue(mockQuery);
    mockEq.mockResolvedValue({
      data: [fakeAttendanceRow],
      error: null,
    });

    mockFetchUserById.mockResolvedValueOnce(fakeUser);

    const result = await fetchEventAttendees(mockSupabase, eventId);

    expect(result).toHaveLength(1);

    const attendance = result[0];
    expect(attendance.eventId).toBe(eventId);
    expect(attendance.userId).toBe(fakeUser.id);
    expect(attendance.status).toBe('attending');
    expect(attendance.createdAt).toBeInstanceOf(Date);
    expect(attendance.updatedAt).toBeInstanceOf(Date);
  });
});
