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
    it('should leave event and return void', async () => {
      // Mock successful deletion
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(
        mockSupabase.from('event_attendances').delete,
      ).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

      const result = await leaveEvent(mockSupabase, eventId);

      expect(result).toBeUndefined();

      // Verify the delete was called with correct parameters
      expect(mockDelete).toHaveBeenCalled();
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

    it('should throw database error when delete fails', async () => {
      const dbError = new Error('Database error');

      // Mock deletion failure
      const mockDelete = vi.fn().mockResolvedValue({ error: dbError });
      vi.mocked(
        mockSupabase.from('event_attendances').delete,
      ).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

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

    it('should only delete attendance record for the authenticated user', async () => {
      // Mock successful deletion - the chain resolves to { error: null }
      const mockSecondEq = vi.fn().mockResolvedValue({ error: null });
      const mockFirstEq = vi.fn().mockReturnValue({
        eq: mockSecondEq,
      });
      vi.mocked(
        mockSupabase.from('event_attendances').delete,
      ).mockReturnValue({
        eq: mockFirstEq,
      });

      await leaveEvent(mockSupabase, eventId);

      // Verify that both event_id and user_id filters are applied
      expect(mockFirstEq).toHaveBeenCalledWith('event_id', eventId);
      expect(mockSecondEq).toHaveBeenCalledWith('user_id', userId);
    });
  });
});