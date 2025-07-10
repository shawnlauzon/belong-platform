import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createMockSupabase } from '@/test-utils';
import { leaveEvent } from '../../api/leaveEvent';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

describe('leaveEvent', () => {
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

  describe('successful leave scenarios', () => {
    it('should leave event and return attendance info with not_attending status', async () => {
      // Mock successful upsert that returns attendance data
      const mockAttendanceData = {
        id: faker.string.uuid(),
        event_id: eventId,
        user_id: userId,
        status: 'not_attending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock the entire chain: upsert().select().single()
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: mockAttendanceData, 
        error: null 
      });
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });
      
      // Mock the from().upsert() chain
      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as ReturnType<typeof mockSupabase.from>);

      const result = await leaveEvent(mockSupabase, eventId);

      expect(result).toBeDefined();
      expect(result?.status).toBe('not_attending');
      expect(result?.eventId).toBe(eventId);
      expect(result?.userId).toBe(userId);

      // Verify upsert was called with correct parameters
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: eventId,
          user_id: userId,
          status: 'not_attending',
        }),
        { onConflict: 'event_id,user_id' }
      );
    });
  });

  describe('error scenarios', () => {
    it('should throw error when not authenticated', async () => {
      // Mock auth failure
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(leaveEvent(mockSupabase, eventId)).rejects.toThrow();
    });

    it('should throw database error when upsert fails', async () => {
      const dbError = new Error('Database error');

      // Mock upsert failure
      const mockSingle = vi.fn().mockResolvedValue({ 
        data: null, 
        error: dbError 
      });
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });
      
      // Mock the from().upsert() chain
      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as ReturnType<typeof mockSupabase.from>);

      await expect(leaveEvent(mockSupabase, eventId)).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('business logic validation', () => {
    it('should require authentication before allowing leave', async () => {
      // This test ensures authentication is checked BEFORE any database operations
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      await expect(leaveEvent(mockSupabase, eventId)).rejects.toThrow();

      // Verify no database operations were attempted
      expect(vi.mocked(mockSupabase.from)).not.toHaveBeenCalled();
    });

    it('should only update attendance record for the authenticated user', async () => {
      // Mock successful upsert
      const mockAttendanceData = {
        id: faker.string.uuid(),
        event_id: eventId,
        user_id: userId,
        status: 'not_attending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockSingle = vi.fn().mockResolvedValue({ 
        data: mockAttendanceData, 
        error: null 
      });
      const mockSelect = vi.fn().mockReturnValue({
        single: mockSingle,
      });
      const mockUpsert = vi.fn().mockReturnValue({
        select: mockSelect,
      });
      
      // Mock the from().upsert() chain
      vi.mocked(mockSupabase.from).mockReturnValue({
        upsert: mockUpsert,
      } as ReturnType<typeof mockSupabase.from>);

      await leaveEvent(mockSupabase, eventId);

      // Verify that the upsert includes the correct user_id and event_id
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: eventId,
          user_id: userId,
          status: 'not_attending',
        }),
        { onConflict: 'event_id,user_id' }
      );
    });
  });
});