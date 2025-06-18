import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { updateResource } from '../impl/updateResource';
import { createMockDbResource } from '../../test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import { ResourceCategory } from '@belongnetwork/types';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockResourceOwner,
  mockNonResourceOwner,
  mockSuccessfulUpdate,
  generateTestResource,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  TEST_RESOURCE_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('Update Resource - CRUD Operations', () => {
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
    it('should update resource when user is the owner', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: faker.commerce.productName(),
        description: faker.lorem.paragraph(),
        category: ResourceCategory.SERVICES,
      };

      const mockUpdatedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: updateData.title,
        description: updateData.description,
        category: updateData.category,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        updated_at: new Date().toISOString(),
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: TEST_RESOURCE_ID,
        title: updateData.title,
        description: updateData.description,
        category: updateData.category,
        owner: expect.objectContaining({
          id: TEST_USER_ID,
        }),
        community: expect.objectContaining({
          id: TEST_COMMUNITY_ID,
        }),
      });
    });

    it('should update only provided fields and keep others unchanged', async () => {
      // Arrange - Only update title
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'New Updated Title',
      };

      const originalResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: 'Original Title',
        description: 'Original Description',
        category: ResourceCategory.FOOD,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      });

      const mockUpdatedResource = {
        ...originalResource,
        title: 'New Updated Title',
        updated_at: new Date().toISOString(),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(result.title).toBe('New Updated Title');
      expect(result.description).toBe('Original Description'); // Should remain unchanged
      expect(result.category).toBe(ResourceCategory.FOOD); // Should remain unchanged
    });

    it('should update resource category and type', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        category: ResourceCategory.HOUSING,
        type: 'request' as const,
      };

      const mockUpdatedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        category: ResourceCategory.HOUSING,
        type: 'request',
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        updated_at: new Date().toISOString(),
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(result.category).toBe(ResourceCategory.HOUSING);
      expect(result.type).toBe('request');
    });

    it('should update resource active status', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        isActive: false,
      };

      const mockUpdatedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        is_active: false,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        updated_at: new Date().toISOString(),
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(result.isActive).toBe(false);
    });

    it('should include updated timestamp in response', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'Updated Title',
      };

      const updatedAt = new Date().toISOString();
      const mockUpdatedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: 'Updated Title',
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        updated_at: updatedAt,
      });

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(result.updatedAt).toEqual(new Date(updatedAt));
    });
  });

  describe('Authorization Failures', () => {
    it('should fail when user is not authenticated', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'New Title',
      };

      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );

      // Verify no ownership check was attempted
      expect(mocks.mockSupabase.from).not.toHaveBeenCalledWith('resources');
    });

    it('should fail when user is not the resource owner', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'New Title',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockNonResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID, DIFFERENT_USER_ID);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(
        'You are not authorized to update this resource'
      );

      // Verify auth and ownership checks were performed
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should fail when resource does not exist', async () => {
      // Arrange
      const updateData = {
        id: 'non-existent-resource',
        title: 'New Title',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Mock resource lookup returning null
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found
        }),
      };

      mocks.mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'resources') {
          return mockOwnershipQuery;
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockReturnThis(),
        };
      });

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow();
    });

    it('should handle different user attempting to update', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'Malicious Update',
      };

      // Different user tries to update
      const maliciousUserId = faker.string.uuid();
      mockAuthenticatedUser(mocks.mockSupabase, maliciousUserId);
      mockNonResourceOwner(mocks.mockSupabase, maliciousUserId, TEST_RESOURCE_ID, TEST_USER_ID);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(
        'You are not authorized to update this resource'
      );
    });
  });

  describe('Database Errors', () => {
    it('should handle ownership check database errors', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'New Title',
      };

      const dbError = new Error('Database connection failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(dbError),
      };

      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(dbError);
    });

    it('should handle update operation database errors', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        title: 'New Title',
      };

      const dbError = new Error('Update constraint violation');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Mock successful ownership check
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID },
          error: null,
        }),
      };

      // Mock failed update
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(dbError);
    });

  });

  describe('Data Validation', () => {
    it('should validate resource ID is provided', async () => {
      // Arrange
      const updateDataWithoutId = {
        title: 'New Title',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Act & Assert
      await expect(updateResource(updateDataWithoutId as any)).rejects.toThrow();
    });

    it('should handle empty update data', async () => {
      // Arrange - Only ID provided, no fields to update
      const updateData = {
        id: TEST_RESOURCE_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);

      // Should still perform update (even if no fields changed)
      const mockUpdatedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        updated_at: new Date().toISOString(),
      });

      mockSuccessfulUpdate(mocks.mockSupabase, 'resources', mockUpdatedResource);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(result.id).toBe(TEST_RESOURCE_ID);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should validate enum values for category', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        category: 'invalid-category' as any,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow();
    });

    it('should validate enum values for type', async () => {
      // Arrange
      const updateData = {
        id: TEST_RESOURCE_ID,
        type: 'invalid-type' as any,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockResourceOwner(mocks.mockSupabase, TEST_USER_ID, TEST_RESOURCE_ID);

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow();
    });
  });
});