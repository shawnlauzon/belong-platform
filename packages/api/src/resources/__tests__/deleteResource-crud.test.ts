import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { deleteResource } from '../impl/deleteResource';
import { createMockDbResource } from '../../test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockResourceOwner,
  mockNonResourceOwner,
  mockSuccessfulUpdate,
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

describe('Delete Resource - CRUD Operations', () => {
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
    it('should soft delete resource when user is the owner', async () => {
      // Arrange
      const mockDeletedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: false, // Soft deleted
        updated_at: new Date().toISOString(),
      });

      // Mock ownership check
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      // Mock successful soft delete (update is_active to false)
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDeletedResource,
          error: null,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act
      const result = await deleteResource(TEST_RESOURCE_ID);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockOwnershipQuery.select).toHaveBeenCalledWith('owner_id, community_id');
      expect(mockOwnershipQuery.eq).toHaveBeenCalledWith('id', TEST_RESOURCE_ID);
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(result).toMatchObject({
        id: TEST_RESOURCE_ID,
        isActive: false,
        owner: expect.objectContaining({
          id: TEST_USER_ID,
        }),
        community: expect.objectContaining({
          id: TEST_COMMUNITY_ID,
        }),
      });
    });

    it('should return null when resource does not exist (no error thrown)', async () => {
      // Arrange
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error code
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act
      const result = await deleteResource('non-existent-id');

      // Assert
      expect(result).toBeNull();
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
    });

    it('should update the updated_at timestamp during soft delete', async () => {
      // Arrange
      const currentTime = new Date().toISOString();
      const mockDeletedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: false,
        updated_at: currentTime,
      });

      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDeletedResource,
          error: null,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act
      const result = await deleteResource(TEST_RESOURCE_ID);

      // Assert
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(result?.updatedAt).toEqual(new Date(currentTime));
    });

    it('should preserve all other resource fields during soft delete', async () => {
      // Arrange
      const originalTitle = 'Original Resource Title';
      const originalDescription = 'Original resource description';
      
      const mockDeletedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        title: originalTitle,
        description: originalDescription,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDeletedResource,
          error: null,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act
      const result = await deleteResource(TEST_RESOURCE_ID);

      // Assert
      expect(result).toMatchObject({
        id: TEST_RESOURCE_ID,
        title: originalTitle,
        description: originalDescription,
        isActive: false, // Only this should change
      });
    });
  });

  describe('Authorization Failures', () => {
    it('should fail when user is not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );

      // Verify no database operations were attempted
      expect(mocks.mockSupabase.from).not.toHaveBeenCalledWith('resources');
    });

    it('should fail when user is not the resource owner', async () => {
      // Arrange
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: DIFFERENT_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(
        'You are not authorized to delete this resource'
      );

      // Verify auth and ownership checks were performed
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockOwnershipQuery.select).toHaveBeenCalledWith('owner_id, community_id');
    });

    it('should handle different user attempting to delete', async () => {
      // Arrange
      const maliciousUserId = faker.string.uuid();
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      // Different user tries to delete
      mockAuthenticatedUser(mocks.mockSupabase, maliciousUserId);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(
        'You are not authorized to delete this resource'
      );
    });

    it('should handle resource ownership check with null data', async () => {
      // Arrange
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' }, // Not found error code
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act
      const result = await deleteResource(TEST_RESOURCE_ID);

      // Assert - Should return null when resource doesn't exist
      expect(result).toBeNull();
    });
  });

  describe('Database Errors', () => {
    it('should handle ownership check database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed during ownership check');
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockRejectedValue(dbError),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(dbError);
    });

    it('should handle ownership check returning error object', async () => {
      // Arrange
      const dbError = new Error('Constraint violation');
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(dbError);
    });

    it('should handle soft delete operation database errors', async () => {
      // Arrange
      const dbError = new Error('Update operation failed');
      
      // Mock successful ownership check
      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
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

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(dbError);
    });


    it('should handle authentication service errors', async () => {
      // Arrange
      const authError = new Error('Authentication service unavailable');
      mocks.mockSupabase.auth.getUser.mockRejectedValue(authError);

      // Act & Assert
      await expect(deleteResource(TEST_RESOURCE_ID)).rejects.toThrow(authError);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty resource ID', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Act & Assert
      await expect(deleteResource('')).rejects.toThrow();
    });

    it('should handle null resource ID', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Act & Assert
      await expect(deleteResource(null as any)).rejects.toThrow();
    });

    it('should handle undefined resource ID', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      // Act & Assert
      await expect(deleteResource(undefined as any)).rejects.toThrow();
    });

    it('should handle very long resource ID', async () => {
      // Arrange
      const veryLongId = 'a'.repeat(1000);
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);

      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116' },
        }),
      };

      mocks.mockSupabase.from.mockReturnValue(mockOwnershipQuery);

      // Act
      const result = await deleteResource(veryLongId);

      // Assert
      expect(result).toBeNull();
      expect(mockOwnershipQuery.eq).toHaveBeenCalledWith('id', veryLongId);
    });
  });

  describe('Soft Delete Verification', () => {
    it('should only set is_active to false, not remove from database', async () => {
      // Arrange
      const mockDeletedResource = createMockDbResource({
        id: TEST_RESOURCE_ID,
        owner_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
        is_active: false,
        updated_at: new Date().toISOString(),
      });

      const mockOwnershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { owner_id: TEST_USER_ID, community_id: TEST_COMMUNITY_ID },
          error: null,
        }),
      };

      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDeletedResource,
          error: null,
        }),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mocks.mockSupabase.from
        .mockReturnValueOnce(mockOwnershipQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act
      await deleteResource(TEST_RESOURCE_ID);

      // Assert - Verify update was called, not delete
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      
      // Verify that we're using update for soft delete, not hard delete
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('resources');
    });
  });
});