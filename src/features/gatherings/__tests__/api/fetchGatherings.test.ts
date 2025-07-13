import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGatherings } from '../../api/fetchGatherings';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeGathering, createFakeGatheringRow } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeCommunity } from '../../../communities/__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { Gathering, GatheringFilter } from '../../types';
import type { GatheringRowWithRelations } from '../../types/gatheringRow';

// Helper function to create fake gathering with relations for testing
function createFakeGatheringRowWithRelations(overrides: Partial<GatheringRowWithRelations> = {}): GatheringRowWithRelations {
  const row = createFakeGatheringRow();
  const organizer = createFakeUser();
  const community = createFakeCommunity();
  
  return {
    ...row,
    organizer: {
      id: organizer.id,
      created_at: organizer.createdAt.toISOString(),
      updated_at: organizer.updatedAt.toISOString(),
      user_metadata: {
        first_name: organizer.firstName,
        avatar_url: organizer.avatarUrl,
      },
    },
    community: {
      id: community.id,
      name: community.name,
      description: community.description,
      center_name: community.centerName,
      center: `POINT(${community.center.lng} ${community.center.lat})`,
      boundary: community.boundary,
      type: community.type,
      organizer_id: community.organizerId,
      member_count: community.memberCount,
      time_zone: community.timeZone,
      icon: community.icon,
      banner_image_url: community.bannerImageUrl,
      created_at: community.createdAt.toISOString(),
      updated_at: community.updatedAt.toISOString(),
    },
    ...overrides,
  };
}

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

    // Create fake gatherings - one past, one future
    const pastGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      end_date_time: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
    });
    
    const futureGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end_date_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [pastGathering, futureGathering],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase, filters);

    // Should only return future gathering, not past
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(futureGathering.id);
  });

  it('should apply time-based filtering when includeCurrent is false', async () => {
    const filters: GatheringFilter = { includeCurrent: false };

    // Create fake gatherings - one current, one past, one future
    const currentGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      end_date_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    });
    
    const pastGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      end_date_time: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
    });
    
    const futureGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end_date_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [currentGathering, pastGathering, futureGathering],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase, filters);

    // Should return past and future, but not current
    expect(result).toHaveLength(2);
    expect(result.map(g => g.id)).toContain(pastGathering.id);
    expect(result.map(g => g.id)).toContain(futureGathering.id);
    expect(result.map(g => g.id)).not.toContain(currentGathering.id);
  });

  it('should apply time-based filtering when includeFuture is false', async () => {
    const filters: GatheringFilter = { includeFuture: false };

    // Create fake gatherings - one current, one past, one future
    const currentGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
      end_date_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    });
    
    const pastGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      end_date_time: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
    });
    
    const futureGathering = createFakeGatheringRowWithRelations({
      start_date_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
      end_date_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [currentGathering, pastGathering, futureGathering],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase, filters);

    // Should return past and current, but not future
    expect(result).toHaveLength(2);
    expect(result.map(g => g.id)).toContain(pastGathering.id);
    expect(result.map(g => g.id)).toContain(currentGathering.id);
    expect(result.map(g => g.id)).not.toContain(futureGathering.id);
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

  it('should classify all-day gatherings correctly by start time', async () => {
    const filters: GatheringFilter = { includePast: false, includeCurrent: true, includeFuture: false };

    // Mock current time to be 11:00 AM  
    const mockNow = new Date();
    mockNow.setHours(11, 0, 0, 0); // 11:00 AM
    vi.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());
    // Also mock new Date() constructor to return the mocked time
    const OriginalDate = Date;
    vi.spyOn(global, 'Date').mockImplementation((...args) => {
      if (args.length === 0) {
        return new OriginalDate(mockNow.getTime());
      }
      return new OriginalDate(...args);
    });

    // Create an all-day gathering for today at 5 AM - should be current (before 6 AM cutoff)
    const todayMorning = new Date();
    todayMorning.setHours(5, 0, 0, 0);
    
    const todayAllDayGathering = createFakeGatheringRowWithRelations({
      start_date_time: todayMorning.toISOString(),
      end_date_time: null,
      is_all_day: true,
    });

    // Create an all-day gathering for today at noon - should be future (before noon)
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);
    
    const todayFutureAllDayGathering = createFakeGatheringRowWithRelations({
      start_date_time: todayNoon.toISOString(),
      end_date_time: null,
      is_all_day: true,
    });

    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [todayAllDayGathering, todayFutureAllDayGathering],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    const result = await fetchGatherings(mockSupabase, filters);


    // Should include 5 AM gathering (current at 11 AM) but not noon gathering (future at 11 AM)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(todayAllDayGathering.id);

    // Restore Date.now
    vi.restoreAllMocks();
  });
});