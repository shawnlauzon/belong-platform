import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchEvents, fetchEventById } from '../impl/fetchEvents';
import {
  setupCrudTestMocks,
  mockSuccessfulSelect,
  TEST_USER_ID,
  TEST_COMMUNITY_ID,
  TEST_EVENT_ID,
  type CrudTestMocks,
} from '../../test-utils/crud-test-helpers';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('fetchEvents CRUD Operations', () => {
  let mocks: CrudTestMocks;
  const mockUser = createMockUser({ id: TEST_USER_ID });
  const mockCommunity = createMockCommunity({ id: TEST_COMMUNITY_ID });

  const mockDbEvent = {
    id: TEST_EVENT_ID,
    title: 'Test Event',
    description: 'Test Description',
    community_id: TEST_COMMUNITY_ID,
    organizer_id: TEST_USER_ID,
    start_date_time: new Date().toISOString(),
    end_date_time: null,
    location: 'Test Location',
    coordinates: 'POINT(-122.4194 37.7749)',
    parking_info: 'Free parking available',
    max_attendees: 50,
    registration_required: false,
    is_active: true,
    tags: ['community', 'social'],
    image_urls: ['https://example.com/image.jpg'],
    attendee_count: 10,
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

  describe('fetchEvents - Public Access Tests', () => {
    it('should fetch events without authentication (public access)', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', [mockDbEvent]);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: TEST_EVENT_ID,
        title: 'Test Event',
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should return empty array when no events exist', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', []);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(result).toEqual([]);
    });

    it('should fetch multiple events successfully', async () => {
      // Arrange
      const mockDbEvents = [
        { ...mockDbEvent, id: 'event-1', title: 'Event 1' },
        { ...mockDbEvent, id: 'event-2', title: 'Event 2' },
        { ...mockDbEvent, id: 'event-3', title: 'Event 3' },
      ];
      mockSuccessfulSelect(mocks.mockSupabase, 'events', mockDbEvents);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Event 1');
      expect(result[1].title).toBe('Event 2');
      expect(result[2].title).toBe('Event 3');
    });
  });

  describe('fetchEvents - Filter Tests', () => {
    it('should apply community filter', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockDbEvent], error: null }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchEvents({ communityId: TEST_COMMUNITY_ID });

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('community_id', TEST_COMMUNITY_ID);
    });

    it('should apply organizer filter', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockDbEvent], error: null }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchEvents({ organizerId: TEST_USER_ID });

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', TEST_USER_ID);
    });

    it('should apply isActive filter', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: [mockDbEvent], error: null }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchEvents({ isActive: true });

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should apply search term filter', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: [mockDbEvent], error: null }),
      };
      mocks.mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await fetchEvents({ searchTerm: 'test' });

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%test%,description.ilike.%test%'
      );
    });
  });

  describe('fetchEventById - Single Event Tests', () => {
    it('should fetch a single event by ID successfully', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', mockDbEvent, true);

      // Act
      const result = await fetchEventById(TEST_EVENT_ID);

      // Assert
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('events');
      expect(result).toMatchObject({
        id: TEST_EVENT_ID,
        title: 'Test Event',
        organizer: expect.objectContaining({ id: TEST_USER_ID }),
        community: expect.objectContaining({ id: TEST_COMMUNITY_ID }),
      });
    });

    it('should return null when event is not found', async () => {
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
      const result = await fetchEventById('nonexistent-id');

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
      await expect(fetchEventById(TEST_EVENT_ID)).rejects.toThrow(dbError);
    });
  });

  describe('Data Dependencies Tests', () => {
    it('should handle missing organizer gracefully', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', [mockDbEvent]);
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(result).toHaveLength(0); // Event should be filtered out
      expect(mocks.mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing organizer or community for event'),
        expect.any(Object)
      );
    });

    it('should handle missing community gracefully', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', [mockDbEvent]);
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(result).toHaveLength(0); // Event should be filtered out
      expect(mocks.mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Missing organizer or community for event'),
        expect.any(Object)
      );
    });

    it('should throw error for fetchEventById when organizer is missing', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', mockDbEvent, true);
      vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(null);

      // Act & Assert
      await expect(fetchEventById(TEST_EVENT_ID)).rejects.toThrow(
        'Failed to process event data'
      );
    });

    it('should throw error for fetchEventById when community is missing', async () => {
      // Arrange
      mockSuccessfulSelect(mocks.mockSupabase, 'events', mockDbEvent, true);
      vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(null);

      // Act & Assert
      await expect(fetchEventById(TEST_EVENT_ID)).rejects.toThrow(
        'Failed to process event data'
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle database errors in fetchEvents', async () => {
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
      await expect(fetchEvents()).rejects.toThrow(dbError);
    });

    it('should handle transformation errors gracefully in fetchEvents', async () => {
      // Arrange
      const invalidDbEvent = { ...mockDbEvent, start_date_time: null }; // This will cause transformer error
      mockSuccessfulSelect(mocks.mockSupabase, 'events', [invalidDbEvent]);

      // Act
      const result = await fetchEvents();

      // Assert
      expect(result).toHaveLength(0); // Invalid event should be filtered out
      expect(mocks.mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error transforming event'),
        expect.any(Object)
      );
    });

    it('should handle null data in fetchEventById', async () => {
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
      const result = await fetchEventById(TEST_EVENT_ID);

      // Assert
      expect(result).toBeNull();
    });
  });
});