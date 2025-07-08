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

      // Mock successful database upsert
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

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      // Verify data transformation from database to domain format
      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });

      // Verify correct data transformation for database upsert
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        {
          event_id: eventId,
          user_id: userId,
          status: 'attending',
        },
        { onConflict: 'event_id,user_id' }
      );
    });

    it('should join event with maybe status and return EventAttendance', async () => {
      const mockAttendanceRow = {
        event_id: eventId,
        user_id: userId,
        status: 'maybe' as const,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful database upsert
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

      // Mock successful database upsert
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

      const mockQueryBuilder = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

      await expect(joinEvent(mockSupabase, eventId)).rejects.toThrow(
        dbError,
      );
    });

    it('should return null when no data is returned after upsert', async () => {
      // Mock successful upsert but no data returned (edge case)
      const mockQueryBuilder = {
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      // @ts-expect-error Mock implementation doesn't need full QueryBuilder interface
      vi.mocked(mockSupabase.from).mockReturnValue(mockQueryBuilder);

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

      const result = await joinEvent(mockSupabase, eventId, 'attending');

      expect(result).toEqual({
        eventId: eventId,
        userId: userId,
        status: 'attending',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-02T00:00:00Z'),
      });

      // Verify upsert was called with conflict handling
      expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
        {
          event_id: eventId,
          user_id: userId,
          status: 'attending',
        },
        { onConflict: 'event_id,user_id' }
      );
    });
  });
});