import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGatheringResponses } from '../../api/fetchGatheringResponses';
import { createFakeGatheringResponseRow } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the user API function
vi.mock('../../../users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

import { fetchUserById } from '../../../users/api/fetchUserById';
const mockFetchUserById = vi.mocked(fetchUserById);

describe('fetchGatheringResponses', () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupabaseClient<Database>;
  });

  it('should fetch gathering attendees with user data successfully', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();

    const fakeResponseRows = [
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
        user_id: fakeUser1.id,
        status: 'attending',
      }),
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
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
      data: fakeResponseRows,
      error: null,
    });

    // Mock chain setup
    vi.mocked(mockSupabase.from).mockReturnValue(
      mockQuery as unknown as ReturnType<typeof mockSupabase.from>,
    );

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      gatheringId,
      userId: fakeUser1.id,
      status: 'attending',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });
    expect(result[1]).toEqual({
      gatheringId,
      userId: fakeUser2.id,
      status: 'maybe',
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
    });

    expect(mockSupabase.from).toHaveBeenCalledWith('gathering_responses');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('gathering_id', gatheringId);
    // API no longer fetches user data
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should handle different attendance statuses', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser1 = createFakeUser();
    const fakeUser2 = createFakeUser();
    const fakeUser3 = createFakeUser();

    const fakeResponseRows = [
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
        user_id: fakeUser1.id,
        status: 'attending',
      }),
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
        user_id: fakeUser2.id,
        status: 'maybe',
      }),
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
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
      data: fakeResponseRows,
      error: null,
    });

    mockFetchUserById
      .mockResolvedValueOnce(fakeUser1)
      .mockResolvedValueOnce(fakeUser2)
      .mockResolvedValueOnce(fakeUser3);

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('attending');
    expect(result[1].status).toBe('maybe');
    expect(result[2].status).toBe('not_attending');
  });

  it('should handle empty attendees list', async () => {
    const gatheringId = 'test-gathering-id';

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

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    expect(result).toEqual([]);
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    const gatheringId = 'test-gathering-id';
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

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    expect(result).toEqual([]);
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should return all attendance records without filtering', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser = createFakeUser();

    const fakeResponseRows = [
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
        user_id: fakeUser.id,
        status: 'attending',
      }),
      createFakeGatheringResponseRow({
        gathering_id: gatheringId,
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
      data: fakeResponseRows,
      error: null,
    });

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    // Should return all records, not filter any out
    expect(result).toHaveLength(2);
    expect(result[0].userId).toEqual(fakeUser.id);
    expect(result[1].userId).toEqual('nonexistent-user');
    // API no longer fetches user data
    expect(mockFetchUserById).not.toHaveBeenCalled();
  });

  it('should return GatheringResponses with proper structure', async () => {
    const gatheringId = 'test-gathering-id';
    const fakeUser = createFakeUser();

    const fakeResponseRow = createFakeGatheringResponseRow({
      gathering_id: gatheringId,
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
      data: [fakeResponseRow],
      error: null,
    });

    mockFetchUserById.mockResolvedValueOnce(fakeUser);

    const result = await fetchGatheringResponses(mockSupabase, gatheringId);

    expect(result).toHaveLength(1);

    const attendance = result[0];
    expect(attendance.gatheringId).toBe(gatheringId);
    expect(attendance.userId).toBe(fakeUser.id);
    expect(attendance.status).toBe('attending');
  });
});
