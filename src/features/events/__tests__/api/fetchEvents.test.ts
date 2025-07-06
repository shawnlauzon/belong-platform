import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEvents } from '../../api/fetchEvents';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeEventInfo } from '../../__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { EventInfo, EventFilter } from '../../types';

describe('fetchEvents', () => {
  let mockSupabase: SupabaseClient<Database>;
  let fakeEvents: EventInfo[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    
    fakeEvents = [
      createFakeEventInfo(),
      createFakeEventInfo(),
      createFakeEventInfo(),
    ];
  });

  it('should fetch events successfully without filters', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: fakeEvents.map(event => ({
          ...event,
          start_date_time: event.startDateTime.toISOString(),
          end_date_time: event.endDateTime?.toISOString() || null,
          organizer_id: event.organizerId,
          community_id: event.communityId,
          is_all_day: event.isAllDay,
          max_attendees: event.maxAttendees || null,
          image_urls: event.imageUrls,
          attendee_count: event.attendeeCount,
          created_at: event.createdAt.toISOString(),
          updated_at: event.updatedAt.toISOString(),
          coordinates: `POINT(${event.coordinates.lng} ${event.coordinates.lat})`,
        })),
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchEvents(mockSupabase);

    expect(mockSupabase.from).toHaveBeenCalledWith('events');
    expect(mockQuery.select).toHaveBeenCalledWith('*');
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
    const filters: EventFilter = { communityId };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeEvents[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchEvents(mockSupabase, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('community_id', communityId);
  });

  it('should apply organizer filter when provided', async () => {
    const organizerId = 'test-organizer-id';
    const filters: EventFilter = { organizerId };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeEvents[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchEvents(mockSupabase, filters);

    expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', organizerId);
  });

  it('should apply date range filters when provided', async () => {
    const startAfter = new Date('2024-01-01');
    const startBefore = new Date('2024-12-31');
    const filters: EventFilter = { startAfter, startBefore };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeEvents[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchEvents(mockSupabase, filters);

    expect(mockQuery.gte).toHaveBeenCalledWith('start_date_time', startAfter.toISOString());
    expect(mockQuery.lte).toHaveBeenCalledWith('start_date_time', startBefore.toISOString());
  });

  it('should apply search term filter when provided', async () => {
    const searchTerm = 'test search';
    const filters: EventFilter = { searchTerm };

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeEvents[0]],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    await fetchEvents(mockSupabase, filters);

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

    const result = await fetchEvents(mockSupabase);

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

    const result = await fetchEvents(mockSupabase);

    expect(result).toEqual([]);
  });
});