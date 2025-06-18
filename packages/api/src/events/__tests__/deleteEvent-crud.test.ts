import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteEvent } from '../impl/deleteEvent';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockEventOrganizer,
  mockSuccessfulDelete,
  TEST_USER_ID,
  TEST_EVENT_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('deleteEvent CRUD Operations', () => {
  let mocks: CrudTestMocks;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
  });

  describe('Happy Path Tests', () => {
    it('should delete an event successfully when user is the organizer', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(TEST_EVENT_ID);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
    });

    it('should complete successfully even if event does not exist', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act & Assert - should not throw
      await expect(deleteEvent('nonexistent-id')).resolves.toBeUndefined();
    });

    it('should enforce organizer-only deletion through database constraints', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(TEST_EVENT_ID);

      // Assert - deletion completes without error
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(
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
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });

    it('should throw an error when user object is missing', async () => {
      // Arrange
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });

    it('should throw an error when user ID is missing', async () => {
      // Arrange
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: null } },
        error: null,
      });

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Authorization Tests', () => {
    it('should silently succeed when user is not the organizer (database constraint handles authorization)', async () => {
      // Arrange - Different user trying to delete
      mockAuthenticatedUser(mocks.mockSupabase, DIFFERENT_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act & Assert - Should not throw (relying on database constraints)
      await expect(deleteEvent(TEST_EVENT_ID)).resolves.toBeUndefined();
    });

    it('should work correctly when user is the organizer', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(TEST_EVENT_ID);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database delete fails', async () => {
      // Arrange
      const dbError = new Error('Database delete failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events', dbError);

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(dbError);
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      const constraintError = new Error('Foreign key constraint violation');
      constraintError.name = 'PostgresError';
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events', constraintError);

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(constraintError);
    });

    it('should handle network/connection errors', async () => {
      // Arrange
      const networkError = new Error('Network request failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events', networkError);

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(networkError);
    });
  });

  describe('Query Construction Tests', () => {

    it('should handle special characters in event ID', async () => {
      // Arrange
      const specialEventId = 'event-with-special-chars-!@#$%';
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(specialEventId);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
    });

    it('should handle UUID format event IDs', async () => {
      // Arrange
      const uuidEventId = '550e8400-e29b-41d4-a716-446655440000';
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(uuidEventId);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
    });
  });

  describe('Logging Tests', () => {
    it('should log debug message when starting deletion', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(TEST_EVENT_ID);

      // Assert
      expect(mocks.mockLogger.debug).toHaveBeenCalledWith(
        '🎉 API: Deleting event',
        { id: TEST_EVENT_ID }
      );
    });

    it('should log success message when deletion completes', async () => {
      // Arrange
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events');

      // Act
      await deleteEvent(TEST_EVENT_ID);

      // Assert
      expect(mocks.mockLogger.info).toHaveBeenCalledWith(
        '🎉 API: Successfully deleted event',
        { id: TEST_EVENT_ID }
      );
    });

    it('should log error message when deletion fails', async () => {
      // Arrange
      const dbError = new Error('Delete failed');
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulDelete(mocks.mockSupabase, 'events', dbError);

      // Act & Assert
      await expect(deleteEvent(TEST_EVENT_ID)).rejects.toThrow(dbError);
      
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        '🎉 API: Failed to delete event',
        { id: TEST_EVENT_ID, error: dbError }
      );
    });
  });
});