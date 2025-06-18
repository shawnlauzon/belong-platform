import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommunities } from '../impl/fetchCommunities';
import { fetchCommunityById } from '../impl/fetchCommunityById';
import {
  setupCrudTestMocks,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity, createMockDbCommunity } from '../../test-utils/mocks';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('fetchCommunities CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  const mockDbCommunity = createMockDbCommunity({
    id: TEST_COMMUNITY_ID,
    name: 'Test Community',
    description: 'Test Description',
    organizer_id: TEST_USER_ID,
    level: 'city',
    member_count: 150,
    radius_km: 50,
    center: 'POINT(-122.4194 37.7749)',
    parent_id: null,
    hierarchy_path: JSON.stringify([]),
    time_zone: 'America/Los_Angeles',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer: {
      id: TEST_USER_ID,
      email: 'test@example.com',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_metadata: {
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        location: { lat: 37.7749, lng: -122.4194 },
      },
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
  });

  describe('fetchCommunities - Public Access Tests', () => {
    it('should fetch communities without authentication (public access)', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunity],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.select).toHaveBeenCalledWith('*, organizer:profiles!communities_organizer_id_fkey(*)');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: TEST_COMMUNITY_ID,
        name: 'Test Community',
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
      });
    });

    it('should return empty array when no communities exist', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result).toEqual([]);
    });

    it('should fetch multiple communities successfully', async () => {
      // Arrange
      const mockDbCommunities = [
        { ...mockDbCommunity, id: 'community-1', name: 'Community 1' },
        { ...mockDbCommunity, id: 'community-2', name: 'Community 2' },
        { ...mockDbCommunity, id: 'community-3', name: 'Community 3' },
      ];
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockDbCommunities,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Community 1');
      expect(result[1].name).toBe('Community 2');
      expect(result[2].name).toBe('Community 3');
    });

    it('should handle null data response gracefully', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('fetchCommunityById - Single Community Tests', () => {
    it('should fetch a single community by ID successfully', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbCommunity,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunityById(TEST_COMMUNITY_ID);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.select).toHaveBeenCalledWith('*, organizer:profiles!communities_organizer_id_fkey(*)');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', TEST_COMMUNITY_ID);
      expect(result).toMatchObject({
        id: TEST_COMMUNITY_ID,
        name: 'Test Community',
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
      });
    });

    it('should return null when community is not found', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunityById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle database errors appropriately', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchCommunityById(TEST_COMMUNITY_ID)).rejects.toThrow(dbError);
    });
  });

  describe('Data Transformation Tests', () => {
    it('should properly transform database fields to domain fields', async () => {
      // Arrange
      const mockDbCommunityWithAllFields = {
        ...mockDbCommunity,
        member_count: 500,
        radius_km: 75,
        center: 'POINT(-74.0060 40.7128)',
        parent_id: 'parent-123',
        hierarchy_path: JSON.stringify([
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'New York' },
        ]),
        time_zone: 'America/New_York',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunityWithAllFields],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result[0]).toMatchObject({
        memberCount: 500,
        radiusKm: 75,
        center: { lat: 40.7128, lng: -74.0060 }, // Converted from PostGIS
        parentId: 'parent-123',
        hierarchyPath: [
          { level: 'country', name: 'United States' },
          { level: 'state', name: 'New York' },
        ],
        timeZone: 'America/New_York',
      });
    });

    it('should handle missing optional fields gracefully', async () => {
      // Arrange
      const mockDbCommunityMinimal = {
        ...mockDbCommunity,
        description: null,
        radius_km: null,
        center: null,
        parent_id: null,
        hierarchy_path: null,
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunityMinimal],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result[0]).toMatchObject({
        description: undefined,
        radiusKm: undefined,
        center: undefined,
        parentId: null,
        hierarchyPath: [],
      });
    });

    it('should handle organizer data transformation', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunity],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunities();

      // Assert
      expect(result[0].organizer).toMatchObject({
        id: TEST_USER_ID,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
      });
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors in fetchCommunities', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchCommunities()).rejects.toThrow(dbError);
    });

    it('should handle transformation errors gracefully in fetchCommunities', async () => {
      // Arrange
      const invalidDbCommunity = { 
        ...mockDbCommunity, 
        created_at: null, // This will cause transformer error
        organizer: null, // Missing required organizer
      };
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [invalidDbCommunity],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchCommunities()).rejects.toThrow();
    });

    it('should handle null data in fetchCommunityById', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchCommunityById(TEST_COMMUNITY_ID);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('Logging Tests', () => {
    it('should log debug message when starting fetch', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunity],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchCommunities();

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🏘️ API: Fetching communities'
      );
    });

    it('should log debug message when fetch completes successfully', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [mockDbCommunity],
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchCommunities();

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🏘️ API: Successfully fetched communities',
        { count: 1 }
      );
    });

    it('should log error message when fetch fails', async () => {
      // Arrange
      const dbError = new Error('Fetch failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchCommunities()).rejects.toThrow(dbError);
      
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        '🏘️ API: Failed to fetch communities',
        { error: dbError }
      );
    });
  });
});