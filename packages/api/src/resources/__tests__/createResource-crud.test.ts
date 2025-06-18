import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { createResource } from '../impl/createResource';
import { createMockDbResource } from '../../test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import { ResourceCategory } from '@belongnetwork/types';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockCommunityMember,
  mockNonCommunityMember,
  mockSuccessfulInsert,
  generateTestResource,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('Create Resource - CRUD Operations', () => {
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

  describe('Happy Path', () => {
    it('should create resource when user is authenticated and community member', async () => {
      // Arrange
      const resourceData = generateTestResource({ communityId: TEST_COMMUNITY_ID });
      const mockCreatedResource = createMockDbResource({
        title: resourceData.title,
        description: resourceData.description,
        category: resourceData.category,
        type: resourceData.type,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: true,
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'resources', mockCreatedResource);

      // Act
      const result = await createResource(resourceData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: mockCreatedResource.id,
        title: resourceData.title,
        description: resourceData.description,
        category: resourceData.category,
        type: resourceData.type,
        owner: expect.objectContaining({
          id: TEST_USER_ID,
        }),
        community: expect.objectContaining({
          id: TEST_COMMUNITY_ID,
        }),
      });
    });

    it('should create resource with default values when not provided', async () => {
      // Arrange
      const minimalResourceData = {
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        category: ResourceCategory.FOOD,
        type: 'offer' as const,
        communityId: TEST_COMMUNITY_ID,
      };

      const mockCreatedResource = createMockDbResource({
        title: minimalResourceData.title,
        description: minimalResourceData.description,
        category: minimalResourceData.category,
        type: minimalResourceData.type,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: true, // Default value
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'resources', mockCreatedResource);

      // Act
      const result = await createResource(minimalResourceData);

      // Assert
      expect(result.isActive).toBe(true);
      expect(result.owner.id).toBe(TEST_USER_ID);
    });

    it('should handle different resource categories and types', async () => {
      // Arrange
      const resourceData = generateTestResource({
        communityId: TEST_COMMUNITY_ID,
        category: ResourceCategory.SERVICES,
        type: 'request',
      });

      const mockCreatedResource = createMockDbResource({
        title: resourceData.title,
        description: resourceData.description,
        category: ResourceCategory.SERVICES,
        type: 'request',
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: true,
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'resources', mockCreatedResource);

      // Act
      const result = await createResource(resourceData);

      // Assert
      expect(result.category).toBe(ResourceCategory.SERVICES);
      expect(result.type).toBe('request');
    });
  });

  describe('Authorization Failures', () => {
    it('should fail when user is not authenticated', async () => {
      // Arrange
      const resourceData = generateTestResource({ communityId: TEST_COMMUNITY_ID });
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(createResource(resourceData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );

      // Verify no database operations were attempted
      expect(mocks.mockSupabase.from).not.toHaveBeenCalledWith('resources');
    });

    it('should fail when user is not a community member', async () => {
      // Arrange
      const resourceData = generateTestResource({ communityId: TEST_COMMUNITY_ID });
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockNonCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);

      // Act & Assert
      await expect(createResource(resourceData)).rejects.toThrow();

      // Verify auth was checked
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should fail when community does not exist', async () => {
      // Arrange
      const nonExistentCommunityId = faker.string.uuid();
      const resourceData = generateTestResource({ communityId: nonExistentCommunityId });
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      // Mock community lookup returning null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(createResource(resourceData)).rejects.toThrow();
    });

    it('should fail when user does not exist', async () => {
      // Arrange
      const resourceData = generateTestResource({ communityId: TEST_COMMUNITY_ID });
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);
      
      // Mock user lookup returning null
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(createResource(resourceData)).rejects.toThrow();
    });
  });

  describe('Database Errors', () => {
    it('should throw error when database insert fails', async () => {
      // Arrange
      const resourceData = generateTestResource({ communityId: TEST_COMMUNITY_ID });
      const dbError = new Error('Database insertion failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);

      // Mock database insert failure
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'resources') {
          return mockQuery;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        };
      });

      // Act & Assert
      await expect(createResource(resourceData)).rejects.toThrow(dbError);
    });

  });

  describe('Data Validation', () => {
    it('should validate required fields', async () => {
      // Arrange
      const invalidResourceData = {
        // Missing required fields
        communityId: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);

      // Act & Assert
      await expect(createResource(invalidResourceData as any)).rejects.toThrow();
    });

    it('should handle empty strings appropriately', async () => {
      // Arrange
      const resourceDataWithEmptyStrings = {
        title: '', // Empty title should cause validation error
        description: faker.lorem.paragraph(),
        category: ResourceCategory.FOOD,
        type: 'offer' as const,
        communityId: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockCommunityMember(mocks.mockSupabase, TEST_USER_ID, TEST_COMMUNITY_ID);

      // Act & Assert
      await expect(createResource(resourceDataWithEmptyStrings)).rejects.toThrow();
    });
  });
});