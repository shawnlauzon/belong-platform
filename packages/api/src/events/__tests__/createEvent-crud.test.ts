import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEvent } from '../impl/createEvent';
import {
  setupCrudTestMocks,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockCommunityMember,
  mockNonCommunityMember,
  mockSuccessfulInsert,
  generateTestEvent,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  DIFFERENT_USER_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity, createMockEvent } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('createEvent CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = setupCrudTestMocks();
    
    // Mock fetchUserById and fetchCommunityById
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  describe('Happy Path Tests', () => {
    it('should create an event successfully when user is authenticated', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z'),
        endDate: new Date('2024-12-25T18:00:00Z')
      });
      const mockDbEvent = {
        id: 'event-123',
        title: eventData.title,
        description: eventData.description,
        community_id: TEST_COMMUNITY_ID,
        organizer_id: TEST_USER_ID,
        start_date_time: eventData.startDate.toISOString(),
        end_date_time: eventData.endDate?.toISOString() || null,
        location: eventData.location,
        coordinates: `POINT(${eventData.coordinates?.lng} ${eventData.coordinates?.lat})`,
        parking_info: eventData.parkingInfo,
        max_attendees: eventData.maxAttendees || null,
        registration_required: eventData.registrationRequired || false,
        is_active: eventData.isActive || true,
        tags: eventData.tags || [],
        image_urls: eventData.imageUrls || [],
        attendee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await createEvent(eventData);

      // Assert
      expect(mocks.mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result).toMatchObject({
        id: 'event-123',
        title: eventData.title,
        description: eventData.description,
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should create an event with minimal required data', async () => {
      // Arrange
      const minimalEventData = {
        title: 'Test Event',
        description: 'Test Description',
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date(),
        location: 'Test Location',
      };
      const mockDbEvent = {
        id: 'event-minimal',
        title: minimalEventData.title,
        description: minimalEventData.description,
        community_id: TEST_COMMUNITY_ID,
        organizer_id: TEST_USER_ID,
        start_date_time: minimalEventData.startDate.toISOString(),
        end_date_time: null,
        location: minimalEventData.location,
        coordinates: null,
        parking_info: null,
        max_attendees: null,
        registration_required: false,
        is_active: true,
        tags: [],
        image_urls: [],
        attendee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await createEvent(minimalEventData);

      // Assert
      expect(result).toMatchObject({
        id: 'event-minimal',
        title: minimalEventData.title,
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });
  });

  describe('Authentication Tests', () => {
    it('should throw an error when user is not authenticated', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z')
      });
      mockUnauthenticatedUser(mocks.mockSupabase);

      // Act & Assert
      await expect(createEvent(eventData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
      expect(mocks.mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should throw an error when auth.getUser returns an error', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z')
      });
      mocks.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Authentication failed'),
      });

      // Act & Assert
      await expect(createEvent(eventData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('Database Error Tests', () => {
    it('should throw an error when database insert fails', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z')
      });
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
      await expect(createEvent(eventData)).rejects.toThrow(dbError);
    });

    it('should throw an error when organizer is not found', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z')
      });
      const mockDbEvent = {
        id: 'event-123',
        organizer_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'events', mockDbEvent);
      
      // Mock fetchUserById to return null
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(createEvent(eventData)).rejects.toThrow('Organizer not found');
    });

    it('should throw an error when community is not found', async () => {
      // Arrange
      const eventData = generateTestEvent({ 
        communityId: TEST_COMMUNITY_ID,
        startDate: new Date('2024-12-25T15:00:00Z')
      });
      const mockDbEvent = {
        id: 'event-123',
        organizer_id: TEST_USER_ID,
        community_id: TEST_COMMUNITY_ID,
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'events', mockDbEvent);
      
      // Mock fetchCommunityById to return null
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(createEvent(eventData)).rejects.toThrow('Community not found');
    });
  });

  describe('Data Validation Tests', () => {
    it('should handle empty or missing optional fields', async () => {
      // Arrange
      const eventDataWithNulls = {
        title: 'Event with nulls',
        description: 'Description',
        organizerId: TEST_USER_ID,
        communityId: TEST_COMMUNITY_ID,
        startDateTime: new Date(),
        endDateTime: undefined,
        location: 'Location',
        coordinates: { lat: 37.7749, lng: -122.4194 }, // Required field
        parkingInfo: undefined,
        maxAttendees: undefined,
        registrationRequired: undefined,
        tags: undefined,
        imageUrls: undefined,
      };
      const mockDbEvent = {
        id: 'event-null-fields',
        title: eventDataWithNulls.title,
        description: eventDataWithNulls.description,
        community_id: TEST_COMMUNITY_ID,
        organizer_id: TEST_USER_ID,
        start_date_time: eventDataWithNulls.startDateTime.toISOString(),
        end_date_time: null,
        location: eventDataWithNulls.location,
        coordinates: 'POINT(-122.4194 37.7749)',
        parking_info: null,
        max_attendees: null,
        registration_required: false,
        is_active: true,
        tags: [],
        image_urls: [],
        attendee_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      mockSuccessfulInsert(mocks.mockSupabase, 'events', mockDbEvent);

      // Act
      const result = await createEvent(eventDataWithNulls);

      // Assert
      expect(result).toMatchObject({
        id: 'event-null-fields',
        title: eventDataWithNulls.title,
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should correctly transform coordinates to PostGIS format', async () => {
      // Arrange
      const eventData = generateTestEvent({
        organizerId: TEST_USER_ID,
        communityId: TEST_COMMUNITY_ID,
        startDateTime: new Date('2024-12-25T15:00:00Z'),
        coordinates: { lat: 37.7749, lng: -122.4194 },
      });
      
      mockAuthenticatedUser(mocks.mockSupabase, TEST_USER_ID);
      
      // Mock fetchUserById and fetchCommunityById to return the required data
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
      
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'event-coordinates' },
          error: null,
        }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await createEvent(eventData);

      // Assert
      expect(mockQuery.insert).toHaveBeenCalledWith([
        expect.objectContaining({
          coordinates: 'POINT(-122.4194 37.7749)', // lng first, then lat for PostGIS
        })
      ]);
    });
  });
});