import { describe, it, expect, vi, beforeEach } from 'vitest';
import { restoreCommunity } from '../impl/restoreCommunity';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockCommunity } from '../../test-utils/mocks';
import * as fetchCommunityById from '../impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('restoreCommunity CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockCommunity = createMockCommunity({ 
    id: TEST_COMMUNITY_ID,
    organizer: { id: TEST_USER_ID } as any,
    isActive: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock fetchCommunityById to return the restored community
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Happy Path Tests', () => {
    it('should restore a soft deleted community successfully when user is organizer', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      // Mock authorization query to return soft deleted community with correct organizer
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          // First call is for authorization check, second is for update
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act
      const result = await restoreCommunity(TEST_COMMUNITY_ID);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: TEST_COMMUNITY_ID,
        isActive: true,
      });
      expect(fetchCommunityById.fetchCommunityById).toHaveBeenCalledWith(TEST_COMMUNITY_ID);
    });

    it('should verify restore database updates are correct', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act
      await restoreCommunity(TEST_COMMUNITY_ID);

      // Assert - Verify the update call was made
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: true,
        deleted_at: null,
        deleted_by: null,
        updated_at: expect.any(String),
      });
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
      expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error when auth.getUser returns an error', async () => {
      // Arrange
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Authorization Tests', () => {
    it('should reject restore when user is not the organizer', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, DIFFERENT_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false }, // Different organizer
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockAuthQuery);

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'Only community organizers can restore communities'
      );
    });

    it('should reject restore when community is not found', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockAuthQuery);

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'Community not found'
      );
    });

    it('should reject restore when community is not deleted', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: true }, // Already active
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockAuthQuery);

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'Community is not deleted and cannot be restored'
      );
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database restore update fails', async () => {
      // Arrange
      const dbError = new Error('Database restore failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: dbError }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(dbError);
    });

    it('should throw an error when fetchCommunityById fails after restore', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Mock fetchCommunityById to return null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(
        'Failed to fetch restored community'
      );
    });
  });

  describe('Logging Tests', () => {
    it('should log debug message when starting restore', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act
      await restoreCommunity(TEST_COMMUNITY_ID);

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🏘️ API: Restoring soft deleted community',
        { id: TEST_COMMUNITY_ID }
      );
    });

    it('should log success message when restore completes', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act
      await restoreCommunity(TEST_COMMUNITY_ID);

      // Assert
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        '🏘️ API: Successfully restored community',
        expect.objectContaining({
          id: TEST_COMMUNITY_ID,
          restoredBy: TEST_USER_ID,
        })
      );
    });

    it('should log error message when restore fails', async () => {
      // Arrange
      const dbError = new Error('Restore failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockAuthQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { organizer_id: TEST_USER_ID, is_active: false },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: dbError }),
      };

      let callCount = 0;
      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'communities') {
          callCount++;
          if (callCount === 1) {
            return mockAuthQuery;
          } else {
            return mockUpdateQuery;
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
        };
      });

      // Act & Assert
      await expect(restoreCommunity(TEST_COMMUNITY_ID)).rejects.toThrow(dbError);
      
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        '🏘️ API: Failed to restore community',
        { id: TEST_COMMUNITY_ID, error: dbError }
      );
    });
  });
});