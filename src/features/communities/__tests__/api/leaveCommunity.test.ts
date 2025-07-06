import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createMockSupabase } from '@/test-utils';
import { leaveCommunity } from '../../api/leaveCommunity';
import { MESSAGE_ORGANIZER_CANNOT_LEAVE } from '@/shared/constants';

// Mock the logger to avoid console noise
vi.mock('@/shared', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe('leaveCommunity', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let communityId: string;
  let regularUserId: string;
  let organizerUserId: string;

  beforeEach(() => {
    vi.clearAllMocks();
    
    communityId = faker.string.uuid();
    regularUserId = faker.string.uuid();
    organizerUserId = faker.string.uuid();

    // Create mock data with community and memberships
    mockSupabase = createMockSupabase({
      communities: [
        {
          id: communityId,
          name: 'Test Community',
          organizer_id: organizerUserId,
          description: 'A test community',
          center: 'POINT(0 0)',
          time_zone: 'UTC',
          member_count: 2,
          boundary: null,
          boundary_geometry: null,
          icon: null,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      ],
      community_memberships: [
        {
          community_id: communityId,
          user_id: regularUserId,
          joined_at: '2023-01-01T00:00:00Z',
        },
        {
          community_id: communityId,
          user_id: organizerUserId,
          joined_at: '2023-01-01T00:00:00Z',
        },
      ],
    });
  });

  describe('successful leave scenarios', () => {
    it('should allow regular member to leave community', async () => {
      // Mock auth to return regular user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: regularUserId } },
        error: null,
      });

      // Mock successful deletion
      const mockDelete = vi.fn().mockResolvedValue({ error: null });
      mockSupabase.from('community_memberships').delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

      await expect(leaveCommunity(mockSupabase, communityId)).resolves.not.toThrow();

      // Verify the delete was called with correct parameters
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('error scenarios', () => {
    it('should prevent organizer from leaving their own community', async () => {
      // Mock auth to return organizer user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: organizerUserId } },
        error: null,
      });

      // This test should fail with current implementation because it will throw
      // the error for ANY member, not just organizers
      await expect(leaveCommunity(mockSupabase, communityId))
        .rejects
        .toThrow(MESSAGE_ORGANIZER_CANNOT_LEAVE);
    });

    it('should throw error when user is not a member', async () => {
      const nonMemberUserId = faker.string.uuid();
      
      // Mock auth to return non-member user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: nonMemberUserId } },
        error: null,
      });

      await expect(leaveCommunity(mockSupabase, communityId))
        .rejects
        .toThrow('User is not a member of community');
    });

    it('should throw error when not authenticated', async () => {
      // Mock auth failure
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(leaveCommunity(mockSupabase, communityId))
        .rejects
        .toThrow();
    });

    it('should throw error when database deletion fails', async () => {
      // Mock auth to return regular user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: regularUserId } },
        error: null,
      });

      // Mock deletion failure
      const deleteError = new Error('Database error');
      const mockDelete = vi.fn().mockResolvedValue({ error: deleteError });
      mockSupabase.from('community_memberships').delete.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockDelete,
        }),
      });

      await expect(leaveCommunity(mockSupabase, communityId))
        .rejects
        .toThrow(deleteError);
    });
  });

  describe('business logic validation', () => {
    it('should check community organizer status, not just membership', async () => {
      // This test exposes the bug: current implementation checks if user is a member
      // (which they always are if they pass the membership check), but should check
      // if they're the organizer by comparing against community.organizer_id
      
      // Mock auth to return regular user (not organizer)
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: regularUserId } },
        error: null,
      });

      // The bug is that current implementation will throw organizer error for ANY member
      // This test will FAIL with current implementation, proving the bug exists
      await expect(leaveCommunity(mockSupabase, communityId))
        .resolves
        .not.toThrow();
    });
  });
});