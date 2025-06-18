import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommunity } from '../impl/createCommunity';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  generateTestCommunity,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchCommunityById from '../impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('createCommunity CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock fetchCommunityById to return the created community
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Happy Path Tests', () => {
    it('should create a community successfully when user is authenticated', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(communityData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.insert).toHaveBeenCalled();
      expect(mockQuery.select).toHaveBeenCalledWith('id');
      expect(result).toEqual(mockCommunity);
      expect(fetchCommunityById.fetchCommunityById).toHaveBeenCalledWith(TEST_COMMUNITY_ID);
    });

    it('should create a community with minimal required data', async () => {
      // Arrange
      const minimalCommunityData = {
        name: 'Test Community',
        description: 'A test community',
        organizerId: TEST_USER_ID,
        level: 'city' as const,
        hierarchyPath: [],
        timeZone: 'UTC',
      };
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(minimalCommunityData);

      // Assert
      expect(result).toEqual(mockCommunity);
    });

    it('should handle communities with geographic data', async () => {
      // Arrange
      const communityWithLocation = generateTestCommunity({
        center: { lat: 37.7749, lng: -122.4194 },
        radiusKm: 50,
      });
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(communityWithLocation);

      // Assert
      expect(result).toEqual(mockCommunity);
      // Verify the transformer was called with location data
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          center: 'POINT(-122.4194 37.7749)', // PostGIS format: lng first, then lat
        })
      );
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
      expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error when auth.getUser returns an error', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });

    it('should throw an error when user object is missing', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database insert fails', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const dbError = new Error('Database insert failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(dbError);
    });

    it('should throw an error when fetchCommunityById fails after creation', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Mock fetchCommunityById to return null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(
        'Failed to fetch created community'
      );
    });

    it('should handle unique constraint violations', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const constraintError = new Error('duplicate key value violates unique constraint');
      constraintError.name = 'PostgresError';
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: constraintError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(constraintError);
    });
  });

  describe('Data Validation Tests', () => {
    it('should handle communities with hierarchy path', async () => {
      // Arrange
      const communityWithHierarchy = generateTestCommunity({
        hierarchyPath: [
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'California' },
        ],
        parentId: 'parent-community-123',
      });
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(communityWithHierarchy);

      // Assert
      expect(result).toEqual(mockCommunity);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          hierarchy_path: JSON.stringify([
            { level: 'country', name: 'United States' },
            { level: 'state', name: 'California' },
          ]),
          parent_id: 'parent-community-123',
        })
      );
    });

    it('should handle communities with all optional fields', async () => {
      // Arrange
      const fullCommunityData = generateTestCommunity({
        description: 'Full description',
        center: { lat: 40.7128, lng: -74.0060 },
        radiusKm: 25,
        parentId: 'parent-123',
        hierarchyPath: [
          { level: 'country', name: 'United States' },
        ],
        timeZone: 'America/New_York',
      });
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(fullCommunityData);

      // Assert
      expect(result).toEqual(mockCommunity);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: fullCommunityData.name,
          description: fullCommunityData.description,
          center: expect.stringMatching(/^POINT\(-74\.006\d* 40\.7128\)$/),
          radius_km: 25,
          parent_id: 'parent-123',
          time_zone: 'America/New_York',
          organizer_id: fullCommunityData.organizerId,
          level: 'neighborhood',
          hierarchy_path: expect.any(String),
        })
      );
    });

    it('should handle communities without optional fields', async () => {
      // Arrange
      const minimalCommunityData = {
        name: 'Minimal Community',
        organizerId: TEST_USER_ID,
        level: 'neighborhood' as const,
        hierarchyPath: [],
        timeZone: 'UTC',
      };
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createCommunity(minimalCommunityData);

      // Assert
      expect(result).toEqual(mockCommunity);
      expect(mockQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal Community',
          organizer_id: TEST_USER_ID,
          level: 'neighborhood',
          hierarchy_path: JSON.stringify([]),
          time_zone: 'UTC',
        })
      );
    });
  });

  describe('Logging Tests', () => {
    it('should log debug message when starting creation', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await createCommunity(communityData);

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🏘️ API: Creating community',
        { name: communityData.name }
      );
    });

    it('should log success message when creation completes', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const mockDbCommunity = {
        id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await createCommunity(communityData);

      // Assert
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        '🏘️ API: Successfully created community',
        {
          id: mockCommunity.id,
          name: mockCommunity.name,
        }
      );
    });

    it('should log error message when creation fails', async () => {
      // Arrange
      const communityData = generateTestCommunity();
      const dbError = new Error('Creation failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(createCommunity(communityData)).rejects.toThrow(dbError);
      
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        '🏘️ API: Failed to create community',
        { error: dbError }
      );
    });
  });
});