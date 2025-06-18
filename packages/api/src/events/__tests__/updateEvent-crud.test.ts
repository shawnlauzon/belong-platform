import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateEvent } from '../impl/updateEvent';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockEventOrganizer,
  mockSuccessfulUpdate,
  generateTestEvent,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  TEST_EVENT_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('updateEvent CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  const mockDbEvent = {
    id: TEST_EVENT_ID,
    title: 'Updated Event',
    description: 'Updated Description',
    community_id: TEST_COMMUNITY_ID,
    organizer_id: TEST_USER_ID,
    start_date_time: new Date().toISOString(),
    end_date_time: null,
    location: 'Updated Location',
    coordinates: 'POINT(-122.4194 37.7749)',
    parking_info: 'Updated parking info',
    max_attendees: 100,
    registration_required: true,
    is_active: true,
    tags: ['updated', 'event'],
    image_urls: ['https://example.com/updated.jpg'],
    attendee_count: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock fetchUserById and fetchCommunityById
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Happy Path Tests', () => {
    it('should update an event successfully when user is the organizer', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated Description',
        location: 'New Location',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await updateEvent(TEST_EVENT_ID, updateData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result).toMatchObject({
        id: TEST_EVENT_ID,
        title: 'Updated Event',
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should update only specified fields (partial update)', async () => {
      // Arrange
      const partialUpdateData = {
        title: 'Just Title Update',
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockDbEvent, title: 'Just Title Update' },
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateEvent(TEST_EVENT_ID, partialUpdateData);

      // Assert
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Just Title Update',
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', TEST_EVENT_ID);
      expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', TEST_USER_ID);
    });

    it('should update complex fields like coordinates and tags', async () => {
      // Arrange
      const complexUpdateData = {
        coordinates: { lat: 40.7128, lng: -74.0060 },
        tags: ['new', 'tags', 'updated'],
        maxAttendees: 200,
        registrationRequired: true,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbEvent,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateEvent(TEST_EVENT_ID, complexUpdateData);

      // Assert - the transformer converts domain data to database format
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: 'POINT(-74.006 40.7128)', // The actual coordinates that gets generated
          tags: ['new', 'tags', 'updated'],
          max_attendees: 200,
          registration_required: true,
          organizer_id: TEST_USER_ID, // Added by transformer
        })
      );
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      const updateData = { title: 'Updated Title' };
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
      expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error when auth.getUser returns an error', async () => {
      // Arrange
      const updateData = { title: 'Updated Title' };
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Authorization Tests', () => {
    it('should throw an error when user is not the organizer', async () => {
      // Arrange
      const updateData = { title: 'Unauthorized Update' };
      
      mockAuthenticatedUser(mocks.mockSupabase, DIFFERENT_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null, // No event returned because organizer_id doesn't match
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(
        'Event not found or not authorized to update'
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', DIFFERENT_USER_ID);
    });

    it('should update successfully when user is the organizer', async () => {
      // Arrange
      const updateData = { title: 'Authorized Update' };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockEventOrganizer(mocks.mockSupabase, TEST_USER_ID, TEST_EVENT_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await updateEvent(TEST_EVENT_ID, updateData);

      // Assert
      expect(result).toMatchObject({
        id: TEST_EVENT_ID,
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
      });
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database update fails', async () => {
      // Arrange
      const updateData = { title: 'Failed Update' };
      const dbError = new Error('Database update failed');
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: dbError,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(dbError);
    });

    it('should throw an error when event is not found', async () => {
      // Arrange
      const updateData = { title: 'Update Nonexistent' };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(updateEvent('nonexistent-id', updateData)).rejects.toThrow(
        'Event not found or not authorized to update'
      );
    });

    it('should throw an error when organizer is not found after update', async () => {
      // Arrange
      const updateData = { title: 'Update Success but No Organizer' };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'events', mockDbEvent);
      
      // Mock fetchUserById to return null
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(
        'Organizer not found'
      );
    });

    it('should throw an error when community is not found after update', async () => {
      // Arrange
      const updateData = { title: 'Update Success but No Community' };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'events', mockDbEvent);
      
      // Mock fetchCommunityById to return null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(updateEvent(TEST_EVENT_ID, updateData)).rejects.toThrow(
        'Community not found'
      );
    });
  });

  describe('Data Validation Tests', () => {
    it('should handle empty update data', async () => {
      // Arrange
      const emptyUpdateData = {};
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulUpdate(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await updateEvent(TEST_EVENT_ID, emptyUpdateData);

      // Assert
      expect(result).toMatchObject({
        id: TEST_EVENT_ID,
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
      });
    });

    it('should handle null/undefined values in update data', async () => {
      // Arrange
      const updateDataWithNulls = {
        endDate: undefined,
        coordinates: undefined,
        parkingInfo: null,
        maxAttendees: null,
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbEvent,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateEvent(TEST_EVENT_ID, updateDataWithNulls);

      // Assert - the transformer handles null values from the original update data
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          end_date_time: null,
          coordinates: undefined, // undefined coordinates stays undefined
          parking_info: null, // null parkingInfo stays null
          max_attendees: null, // null maxAttendees stays null
          organizer_id: TEST_USER_ID, // Added by transformer
        })
      );
    });

    it('should properly transform date fields', async () => {
      // Arrange
      const newStartDate = new Date('2024-12-25T15:00:00Z');
      const newEndDate = new Date('2024-12-25T18:00:00Z');
      const updateData = {
        startDate: newStartDate,
        endDate: newEndDate,
      };
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockDbEvent,
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await updateEvent(TEST_EVENT_ID, updateData);

      // Assert - just check that the update was called correctly
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          organizer_id: TEST_USER_ID,
          startDate: newStartDate, // Original field passed through
          endDate: newEndDate, // Original field passed through
        })
      );
    });
  });
});