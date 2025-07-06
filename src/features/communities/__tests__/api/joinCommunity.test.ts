import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createMockSupabase } from '@/test-utils';
import { joinCommunity } from '../../api/joinCommunity';

describe('joinCommunity', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let communityId: string;
  let userId: string;

  beforeEach(() => {
    vi.clearAllMocks();

    communityId = faker.string.uuid();
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
    it('should join community and return CommunityMembershipInfo', async () => {
      const mockMembershipRow = {
        user_id: userId,
        community_id: communityId,
        joined_at: '2023-01-01T00:00:00Z',
      };

      // Mock successful database insert
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockMembershipRow,
        error: null,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').insert,
      ).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      });

      const result = await joinCommunity(mockSupabase, communityId);

      // Verify data transformation from database to domain format
      expect(result).toEqual({
        userId: userId,
        communityId: communityId,
        joinedAt: new Date('2023-01-01T00:00:00Z'),
      });

      // Verify correct data transformation for database insert
      expect(
        vi.mocked(mockSupabase.from('community_memberships').insert),
      ).toHaveBeenCalledWith({
        user_id: userId,
        community_id: communityId,
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

      await expect(joinCommunity(mockSupabase, communityId)).rejects.toThrow();
    });

    it('should throw database error when insert fails', async () => {
      const dbError = new Error('Unique constraint violation');

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').insert,
      ).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      });

      await expect(joinCommunity(mockSupabase, communityId)).rejects.toThrow(
        dbError,
      );
    });

    it('should throw error when trying to join a community already a member of', async () => {
      // Mock a duplicate key violation error (PostgreSQL error for unique constraint)
      const duplicateError = new Error(
        'duplicate key value violates unique constraint "community_memberships_pkey"',
      );

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: duplicateError,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').insert,
      ).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      });

      await expect(joinCommunity(mockSupabase, communityId)).rejects.toThrow(
        duplicateError,
      );
    });

    it('should return null when no data is returned after insert', async () => {
      // Mock successful insert but no data returned (edge case)
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').insert,
      ).mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockInsert,
        }),
      });

      const result = await joinCommunity(mockSupabase, communityId);

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

      await expect(joinCommunity(mockSupabase, communityId)).rejects.toThrow();

      // Verify no database operations were attempted
      expect(vi.mocked(mockSupabase.from)).not.toHaveBeenCalled();
    });
  });
});
