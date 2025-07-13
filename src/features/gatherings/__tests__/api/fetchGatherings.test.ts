import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGatherings } from '../../api/fetchGatherings';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeGathering } from '../../__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { Gathering, GatheringFilter } from '../../types';

describe('fetchGatherings', () => {
  let mockSupabase: SupabaseClient<Database>;
  let fakeGatherings: Gathering[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    
    fakeGatherings = [
      createFakeGathering(),
      createFakeGathering(),
      createFakeGathering(),
    ];
  });

  it('should fetch gatherings successfully without filters', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: fakeGatherings.map(gathering => ({
          ...gathering,
          start_date_time: gathering.startDateTime.toISOString(),
          end_date_time: gathering.endDateTime?.toISOString() || null,
          organizer_id: gathering.organizerId,
          community_id: gathering.communityId,
          is_all_day: gathering.isAllDay,
          max_attendees: gathering.maxAttendees || null,
          image_urls: gathering.imageUrls,
          attendee_count: gathering.attendeeCount,
          created_at: gathering.createdAt.toISOString(),
          updated_at: gathering.updatedAt.toISOString(),
          coordinates: `POINT(${gathering.coordinates.lng} ${gathering.coordinates.lat})`,
        })),
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase);

    expect(mockSupabase.from).toHaveBeenCalledWith('gatherings');
    expect(mockQuery.select).toHaveBeenCalledWith(`
    *,
    organizer:profiles!organizer_id(*),
    community:communities!community_id(*)
  `);
    expect(mockQuery.order).toHaveBeenCalledWith('start_date_time', { ascending: true });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: expect.any(String),
      title: expect.any(String),
      description: expect.any(String),
    });
  });

  it('should apply community filter when provided', async () => {
    const communityId = 'test-community-id';
    const filters: GatheringFilter = { communityId };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('community_id', communityId);
  });

  it('should apply organizer filter when provided', async () => {
    const organizerId = 'test-organizer-id';
    const filters: GatheringFilter = { organizerId };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', organizerId);
  });

  it('should apply date range filters when provided', async () => {
    const startAfter = new Date('2024-01-01');
    const startBefore = new Date('2024-12-31');
    const filters: GatheringFilter = { startAfter, startBefore };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.gte).toHaveBeenCalledWith('start_date_time', startAfter.toISOString());
    expect(mockQuery.lte).toHaveBeenCalledWith('start_date_time', startBefore.toISOString());
  });

  it('should apply search term filter when provided', async () => {
    const searchTerm = 'test search';
    const filters: GatheringFilter = { searchTerm };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).toHaveBeenCalledWith(
      `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`,
    );
  });

  it('should return empty array when query fails', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase);

    expect(result).toEqual([]);
  });

  it('should return empty array when no data returned', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase);

    expect(result).toEqual([]);
  });

  it('should apply time-based filtering when includePast is false', async () => {
    const filters: GatheringFilter = { includePast: false };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('is_all_day.eq.true'));
    expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('is_all_day.eq.false'));
  });

  it('should apply time-based filtering when includeCurrent is false', async () => {
    const filters: GatheringFilter = { includeCurrent: false };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('start_date_time.gt.'));
  });

  it('should apply time-based filtering when includeFuture is false', async () => {
    const filters: GatheringFilter = { includeFuture: false };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).toHaveBeenCalledWith(expect.stringContaining('is_all_day'));
  });

  it('should not apply time-based filtering when all time flags are default (true)', async () => {
    const filters: GatheringFilter = { 
      includePast: true, 
      includeCurrent: true, 
      includeFuture: true 
    };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).not.toHaveBeenCalled();
  });

  it('should not apply time-based filtering when no time flags are specified', async () => {
    const filters: GatheringFilter = { communityId: 'test-id' };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeGatherings[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchGatherings(mockSupabase, filters);

    expect(mockQuery.or).not.toHaveBeenCalled();
    expect(mockQuery.eq).toHaveBeenCalledWith('community_id', 'test-id');
  });
});