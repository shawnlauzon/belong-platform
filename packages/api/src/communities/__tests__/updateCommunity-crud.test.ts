import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateCommunity } from '../impl/updateCommunity';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockCommunityOrganizer,
  mockSuccessfulUpdate,
  generateTestCommunity,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchCommunityById from '../impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('updateCommunity CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock fetchCommunityById to return the updated community
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Happy Path Tests', () => {
    it('should update a community successfully when user is authenticated', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Community Name',
        description: 'Updated Description',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateCommunity(updateData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Community Name',
          description: 'Updated Description',
          updated_at: expect.any(String),
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', TEST_COMMUNITY_ID);
      expect(result).toEqual(mockCommunity);
      expect(fetchCommunityById.fetchCommunityById).toHaveBeenCalledWith(TEST_COMMUNITY_ID);
    });

    it('should update only specified fields (partial update)', async () => {
      // Arrange
      const partialUpdateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Just Name Update',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateCommunity(partialUpdateData);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Just Name Update',
          updated_at: expect.any(String),
        })
      );
      expect(result).toEqual(mockCommunity);
    });

    it('should update complex fields like center coordinates and hierarchy', async () => {
      // Arrange
      const complexUpdateData = {
        id: TEST_COMMUNITY_ID,
        center: { lat: 40.7128, lng: -74.0060 },
        hierarchyPath: [
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'New York' },
        ],
        parentId: 'new-parent-123',
        radiusKm: 100,
        timeZone: 'America/New_York',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(complexUpdateData);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          center: expect.stringMatching(/^POINT\(-74\.006\d* 40\.7128\)$/), // lng first, lat second for PostGIS
          hierarchy_path: JSON.stringify([
            { level: 'country', name: 'United States' },
            { level: 'state', name: 'New York' },
          ]),
          parent_id: 'new-parent-123',
          radius_km: 100,
          time_zone: 'America/New_York',
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Name',
      };
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
      expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error when auth.getUser returns an error', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Name',
      };
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });

    it('should throw an error when user object is missing', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Name',
      };
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Authorization Tests', () => {
    it('should update successfully with proper authorization', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Authorized Update',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityOrganizer(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateCommunity(updateData);

      // Assert
      expect(result).toEqual(mockCommunity);
    });

    it('should still work when authorization is handled at database level', async () => {
      // Arrange - Note: Current implementation doesn't check organizer in the update call
      // This test documents current behavior but could be enhanced for better authorization
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Update from any user',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, DIFFERENT_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateCommunity(updateData);

      // Assert - Currently allows any authenticated user to update
      expect(result).toEqual(mockCommunity);
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database update fails', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Failed Update',
      };
      const dbError = new Error('Database update failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(dbError);
    });

    it('should throw an error when community is not found after update', async () => {
      // Arrange
      const updateData = {
        id: 'nonexistent-id',
        name: 'Update Nonexistent',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Mock fetchCommunityById to return null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(
        'Community not found after update'
      );
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        parentId: 'nonexistent-parent',
      };
      const constraintError = new Error('Foreign key constraint violation');
      constraintError.name = 'PostgresError';
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: constraintError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(constraintError);
    });
  });

  describe('Data Validation Tests', () => {
    it('should handle empty update data', async () => {
      // Arrange
      const emptyUpdateData = {
        id: TEST_COMMUNITY_ID,
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateCommunity(emptyUpdateData);

      // Assert
      expect(result).toEqual(mockCommunity);
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      );
    });

    it('should handle null/undefined values in update data', async () => {
      // Arrange
      const updateDataWithNulls = {
        id: TEST_COMMUNITY_ID,
        description: undefined,
        center: undefined,
        radiusKm: null,
        parentId: null,
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(updateDataWithNulls);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          center: undefined,
          radius_km: null,
          parent_id: null,
          updated_at: expect.any(String),
        })
      );
    });

    it('should properly transform organizer ID field', async () => {
      // Arrange
      const updateDataWithOrganizer = {
        id: TEST_COMMUNITY_ID,
        organizerId: 'new-organizer-123',
        name: 'Community with new organizer',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(updateDataWithOrganizer);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_id: 'new-organizer-123',
          name: 'Community with new organizer',
          updated_at: expect.any(String),
        })
      );
    });

    it('should handle all updateable fields correctly', async () => {
      // Arrange
      const fullUpdateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Fully Updated Community',
        description: 'New description',
        organizerId: 'new-organizer-456',
        level: 'neighborhood' as const,
        center: { lat: 34.0522, lng: -118.2437 },
        radiusKm: 75,
        parentId: 'new-parent-789',
        hierarchyPath: [
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'California' },
          { level: 'city', name: 'Los Angeles' },
        ],
        timeZone: 'America/Los_Angeles',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(fullUpdateData);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fully Updated Community',
          description: 'New description',
          organizer_id: 'new-organizer-456',
          level: 'neighborhood',
          center: 'POINT(-118.2437 34.0522)',
          radius_km: 75,
          parent_id: 'new-parent-789',
          hierarchy_path: JSON.stringify([
            { level: 'country', name: 'United States' },
            { level: 'state', name: 'California' },
            { level: 'city', name: 'Los Angeles' },
          ]),
          time_zone: 'America/Los_Angeles',
          updated_at: expect.any(String),
        })
      );
    });
  });

  describe('Logging Tests', () => {
    it('should log debug message when starting update', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Name',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(updateData);

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🏘️ API: Updating community',
        { id: TEST_COMMUNITY_ID }
      );
    });

    it('should log success message when update completes', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Updated Name',
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateCommunity(updateData);

      // Assert
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        '🏘️ API: Successfully updated community',
        {
          id: mockCommunity.id,
          name: mockCommunity.name,
        }
      );
    });

    it('should log error message when update fails', async () => {
      // Arrange
      const updateData = {
        id: TEST_COMMUNITY_ID,
        name: 'Failed Update',
      };
      const dbError = new Error('Update failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateCommunity(updateData)).rejects.toThrow(dbError);
      
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        '🏘️ API: Failed to update community',
        { id: TEST_COMMUNITY_ID, error: dbError }
      );
    });
  });
});