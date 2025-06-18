import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { fetchResources, fetchResourceById } from '../impl/fetchResources';
import { createMockDbResource } from '../../test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import { ResourceCategory } from '@belongnetwork/types';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';
import {
  setupCrudTestMocks,
  mockSuccessfulSelect,
  generateTestResource,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  TEST_RESOURCE_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('Fetch Resources - CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Fetch All Resources - Happy Path', () => {
    it('should fetch all resources without authentication', async () => {
      // Arrange
      const mockResources = Array(3).fill(null).map(() => createMockDbResource({
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      }));

      mockSuccessfulSelect(mocks.mockSupabase, 'resources', mockResources);

      // Act
      const result = await fetchResources();

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toHaveLength(3);
      
      // Verify each resource has proper structure
      result.forEach((resource, index) => {
        expect(resource).toEqual(expect.objectContaining({
          id: mockResources[index].id,
          title: mockResources[index].title,
          owner: mockUser,
          community: mockCommunity,
        }));
      });
    });

    it('should return empty array when no resources exist', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'resources', []);

      // Act
      const result = await fetchResources();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should fetch resources with proper ordering', async () => {
      // Arrange
      const olderResource = createMockDbResource({
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        created_at: '2023-01-01T00:00:00Z',
      });
      
      const newerResource = createMockDbResource({
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        created_at: '2023-12-01T00:00:00Z',
      });

      // Mock resources ordered by created_at DESC (newest first)
      const mockResources = [newerResource, olderResource];
      mockSuccessfulSelect(mocks.mockSupabase, 'resources', mockResources);

      // Act
      const result = await fetchResources();

      // Assert
      expect(result[0].id).toBe(newerResource.id);
      expect(result[1].id).toBe(olderResource.id);
    });
  });


  describe('Fetch Resource by ID - Happy Path', () => {
    it('should fetch a single resource by ID', async () => {
      // Arrange
      const mockResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      });

      mockSuccessfulSelect(mocks.mockSupabase, 'resources', mockResource, true);

      // Act
      const result = await fetchResourceById(TEST_RESOURCE_ID);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toEqual(expect.objectContaining({
        id: TEST_RESOURCE_ID,
        owner: mockUser,
        community: mockCommunity,
      }));
    });

    it('should return null when resource does not exist', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error code
        }),
      };

      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchResourceById('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should include all resource fields in response', async () => {
      // Arrange
      const mockResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: 'Test Resource',
        description: 'Test Description',
        category: ResourceCategory.FOOD,
        type: 'offer',
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      mockSuccessfulSelect(mocks.mockSupabase, 'resources', mockResource, true);

      // Act
      const result = await fetchResourceById(TEST_RESOURCE_ID);

      // Assert
      expect(result).toEqual(expect.objectContaining({
        id: TEST_RESOURCE_ID,
        title: 'Test Resource',
        description: 'Test Description',
        category: ResourceCategory.FOOD,
        type: 'offer',
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        owner: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors when fetching all resources', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockRejectedValue(dbError),
      };

      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchResources()).rejects.toThrow(dbError);
    });

    it('should handle database errors when fetching resource by ID', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(dbError),
      };

      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchResourceById(TEST_RESOURCE_ID)).rejects.toThrow(dbError);
    });

    it('should throw error when database returns error object', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchResources()).rejects.toThrow(dbError);
    });

  });

  describe('Data Transformation', () => {
    it('should properly transform database rows to domain objects', async () => {
      // Arrange
      const mockDbResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: 'Database Title',
        description: 'Database Description',
        category: ResourceCategory.FOOD,
        type: 'offer',
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: true,
        created_at: '2023-01-01T10:00:00Z',
        updated_at: '2023-01-02T11:00:00Z',
      });

      mockSuccessfulSelect(mocks.mockSupabase, 'resources', [mockDbResource]);

      // Act
      const result = await fetchResources();

      // Assert
      const resource = result[0];
      expect(resource).toMatchObject({
        id: TEST_RESOURCE_ID,
        title: 'Database Title',
        description: 'Database Description',
        category: ResourceCategory.FOOD,
        type: 'offer',
        isActive: true,
        owner: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should handle missing owner data gracefully', async () => {
      // Arrange
      const mockDbResource = createMockDbResource({
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      });

      mockSuccessfulSelect(mocks.mockSupabase, 'resources', [mockDbResource]);
      
      // Mock owner fetch returning null (should filter out the resource)
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act
      const result = await fetchResources();

      // Assert - Should return empty array since owner is missing
      expect(result).toEqual([]);
    });
  });
});