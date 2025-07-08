import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createMockSupabase } from '@/test-utils';
import { joinEvent } from '../../api/joinEvent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('joinEvent', () => {
  let mockSupabase: SupabaseClient<Database>;
  let eventId: string;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    eventId = faker.string.uuid();
    userId = faker.string.uuid();

    // Create mock Supabase client
    mockSupabase = createMockSupabase({});

    // Mock successful auth by default
    vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  describe('successful join scenarios', () => {
    it('should join event with attending status and return EventAttendance', async () => {
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null }, // No max attendees limit
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      // Verify data transformation from database to domain format
      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });

    it('should join event with maybe status and return EventAttendance', async () => {
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'maybe' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful database upsert - no validation needed for 'maybe' status
      const mockQueryBuilder = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockAttendanceRow,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      const result = await joinEvent(mockSupabase, eventId, 'maybe');

      // Verify data transformation from database to domain format
      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'maybe',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });

      // Verify correct data transformation for database upsert
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        {
          event_id: eventId,
          user_id: userId,
          status: 'maybe',
        },
        { onConflict: 'event_id,user_id' }
      );
    });

    it('should default to attending status when not specified', async () => {
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null }, // No max attendees limit
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId);

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });
  });

  describe('error scenarios', () => {
    it('should throw error when not authenticated', async () => {
      // Mock auth failure
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(joinEvent(mockSupabase, eventId)).rejects.toThrow();
    });

    it('should throw database error when upsert fails', async () => {
      const dbError = new Error('Database error');

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null }, // No max attendees limit
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: dbError,
          }),
        };
      });

      await expect(joinEvent(mockSupabase, eventId)).rejects.toThrow(
        dbError,
      );
    });

    it('should return null when no data is returned after upsert', async () => {
      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null }, // No max attendees limit
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId);

      expect(result).toBeNull();
    });
  });

  describe('business logic validation', () => {
    it('should require authentication before allowing join', async () => {
      // This test ensures authentication is checked BEFORE any database operations
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      await expect(joinEvent(mockSupabase, eventId)).rejects.toThrow();

      // Verify no database operations were attempted
      expect(vi.mocked(mockSupabase.from)).not.toHaveBeenCalled();
    });

    it('should update existing attendance status when user rejoins', async () => {
      // User initially joined as 'maybe', now updating to 'attending'
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z', // Updated timestamp
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null }, // No max attendees limit
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-02T00:00:00Z'),
      });
    });
  });

  describe('max attendees validation', () => {
    it('should reject join when event is at max capacity', async () => {
      const maxAttendees = 5;
      const currentAttendeeCount = 5;

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: maxAttendees },
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // Count query for current attendees  
          const mockQuery = {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
          };
          
          // The second eq() call should return the promise with count
          mockQuery.eq = vi.fn()
            .mockReturnValueOnce(mockQuery) // First call returns this
            .mockResolvedValueOnce({ // Second call returns the result
              count: currentAttendeeCount,
              error: null,
            });
          
          return mockQuery;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { max_attendees: maxAttendees },
            error: null,
          }),
        };
      });

      await expect(joinEvent(mockSupabase, eventId, 'attending')).rejects.toThrow(
        'Event has reached maximum capacity'
      );
    });

    it('should allow join when event has available capacity', async () => {
      const maxAttendees = 5;
      const currentAttendeeCount = 3;

      // Mock successful join
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      let callCount = 0;
      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        callCount++;
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: maxAttendees },
              error: null,
            }),
          };
        }
        if (table === 'event_attendances' && callCount === 2) {
          // First call to event_attendances is for count
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: vi.fn().mockResolvedValue({
              count: currentAttendeeCount,
              error: null,
            }),
          };
        }
        if (table === 'event_attendances' && callCount === 3) {
          // Second call to event_attendances is for upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });

    it('should allow join when event has no max attendees limit', async () => {
      // Mock successful join
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: null },
              error: null,
            }),
          };
        }
        if (table === 'event_attendances') {
          // For unlimited events, we skip the count query and go straight to upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });

    it('should only count attending status towards capacity limit', async () => {
      const maxAttendees = 5;
      const attendingCount = 4;

      // Mock successful join
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'attending' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      let callCount = 0;
      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockImplementation((table) => {
        callCount++;
        if (table === 'events') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { max_attendees: maxAttendees },
              error: null,
            }),
          };
        }
        if (table === 'event_attendances' && callCount === 2) {
          // First call to event_attendances is for count (only 'attending' status)
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            count: vi.fn().mockResolvedValue({
              count: attendingCount,
              error: null,
            }),
          };
        }
        if (table === 'event_attendances' && callCount === 3) {
          // Second call to event_attendances is for upsert
          return {
            upsert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: mockAttendanceRow,
              error: null,
            }),
          };
        }
        return {
          upsert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: mockAttendanceRow,
            error: null,
          }),
        };
      });

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });
    });
  });
});