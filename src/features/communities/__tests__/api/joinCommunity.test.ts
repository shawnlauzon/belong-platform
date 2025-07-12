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
    it('should join community and return CommunityMembershipInfo when not already a member', async () => {
      // Mock membership check - user is NOT already a member
      const mockMembershipCheck = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').select,
      ).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockMembershipCheck,
          }),
        }),
      });

      const mockMembershipRow = {
        user_id: userId,
        community_id: communityId,
        joined_at: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
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
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      });

      // Verify membership check was performed first
      expect(vi.mocked(mockSupabase.from('community_memberships').select)).toHaveBeenCalled();

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

    it('should throw meaningful error when already a member of the community', async () => {
      // Mock existing membership check - user is already a member
      const mockSelect = vi.fn().mockResolvedValue({
        data: {
          user_id: userId,
          community_id: communityId,
          created_at: '2023-01-01T00:00:00Z',
        },
        error: null,
      });

      vi.mocked(
        mockSupabase.from('community_memberships').select,
      ).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: mockSelect,
          }),
        }),
      });

      await expect(joinCommunity(mockSupabase, communityId)).rejects.toThrow(
        'User is already a member of this community',
      );

      // Verify that insert is not called when already a member
      expect(vi.mocked(mockSupabase.from('community_memberships').insert)).not.toHaveBeenCalled();
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
