import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventService } from '../event.service';
import { createMockUser } from '../../../users/__mocks__';
import { createMockCommunity } from '../../../communities/__mocks__';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../../../shared/constants';
import { createMockEvent } from '../../__mocks__';
import {
  createMockDbEvents,
  QuerySetups,
  EventServiceAssertions,
  TestData,
} from '../../__tests__/eventServiceTestUtils';

// Mock the logger
vi.mock('../../../../shared', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock transformers
vi.mock('../transformers/eventTransformer', () => ({
  toDomainEvent: vi.fn((data) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    startDateTime: new Date(data.start_date_time),
    endDateTime: data.end_date_time ? new Date(data.end_date_time) : undefined,
    location: data.location,
    organizer: data.organizer,
    community: data.community,
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
    deletedBy: data.deleted_by,
    tags: data.tags || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  })),
  toEventInfo: vi.fn((data, organizerId, communityId) => ({
    id: data.id,
    title: data.title,
    description: data.description,
    startDateTime: new Date(data.start_date_time),
    endDateTime: data.end_date_time ? new Date(data.end_date_time) : undefined,
    location: data.location,
    organizerId,
    communityId,
    deletedAt: data.deleted_at ? new Date(data.deleted_at) : null,
    deletedBy: data.deleted_by,
    tags: data.tags || [],
  })),
  forDbInsert: vi.fn((data) => ({
    title: data.title,
    description: data.description,
    start_date_time: data.startDateTime.toISOString(),
    end_date_time: data.endDateTime?.toISOString(),
    location: data.location,
    organizer_id: data.organizerId,
    community_id: data.communityId,
    tags: data.tags,
  })),
  forDbUpdate: vi.fn((data) => ({
    title: data.title,
    description: data.description,
    start_date_time: data.startDateTime?.toISOString(),
    end_date_time: data.endDateTime?.toISOString(),
    location: data.location,
    tags: data.tags,
  })),
}));

// Mock attendance transformer
vi.mock('../transformers/eventAttendanceTransformer', () => ({
  toDomainEventAttendance: vi.fn((data) => ({
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,
    status: data.status,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  })),
  forDbInsert: vi.fn((data) => ({
    event_id: data.eventId,
    user_id: data.userId,
    status: data.status,
  })),
}));

// Mock services
vi.mock('../../../users/services/user.service', () => ({
  createUserService: vi.fn(() => ({
    fetchUserById: vi.fn(),
  })),
}));

vi.mock('../../../communities/services/community.service', () => ({
  createCommunityService: vi.fn(() => ({
    fetchCommunityById: vi.fn(),
  })),
}));

describe('createEventService', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let eventService: ReturnType<typeof createEventService>;
  let mockEvent: ReturnType<typeof createMockEvent>;
  let mockUser: ReturnType<typeof createMockUser>;
  let mockCommunity: ReturnType<typeof createMockCommunity>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockEvent = createMockEvent();
    mockUser = createMockUser();
    mockCommunity = createMockCommunity();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        data: null,
        error: null,
      })),
    } as any;

    // Set up service mocks to return expected values
    const { createUserService } = await import(
      '../../../users/services/user.service'
    );
    const { createCommunityService } = await import(
      '../../../communities/services/community.service'
    );

    // Mock the service creators to return services with mocked methods
    vi.mocked(createUserService).mockReturnValue({
      fetchUserById: vi.fn().mockResolvedValue(mockUser),
    } as any);

    vi.mocked(createCommunityService).mockReturnValue({
      fetchCommunityById: vi.fn().mockResolvedValue(mockCommunity),
    } as any);

    eventService = createEventService(mockSupabase as SupabaseClient);
  });

  describe('fetchEvents', () => {
    it('should fetch events without filters', async () => {
      // Arrange
      const mockDbEvents = createMockDbEvents(2, mockUser, mockCommunity);
      const mockQuery = QuerySetups.fetchEvents(mockSupabase, mockDbEvents);

      // Act
      const result = await eventService.fetchEvents();

      // Assert
      EventServiceAssertions.expectResultLength(result, 2);
    });

    it('should apply community filter', async () => {
      // Arrange
      const mockDbEvents = createMockDbEvents(1, mockUser, mockCommunity);
      const mockQuery = QuerySetups.fetchEventsWithFilter(
        mockSupabase,
        mockDbEvents
      );

      // Act
      const result = await eventService.fetchEvents({
        communityId: mockCommunity.id,
      });

      // Assert
      EventServiceAssertions.expectResultLength(result, 1);
    });

    it('should apply organizer filter', async () => {
      // Arrange
      const mockDbEvents = createMockDbEvents(1, mockUser, mockCommunity);
      const mockQuery = QuerySetups.fetchEventsWithFilter(
        mockSupabase,
        mockDbEvents
      );

      // Act
      const result = await eventService.fetchEvents({
        organizerId: mockUser.id,
      });

      // Assert
      EventServiceAssertions.expectResultLength(result, 1);
    });

    it('should apply date range filters', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const mockDbEvents = [
        {
          id: '1',
          title: 'Event 1',
          description: 'Description 1',
          start_date_time: new Date('2024-06-01').toISOString(),
          organizer_id: mockUser.id,
          community_id: mockCommunity.id,
          deleted_at: null,
          deleted_by: null,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.lte.mockResolvedValue({ data: mockDbEvents, error: null });

      // Act
      const result = await eventService.fetchEvents({ startDate, endDate });

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should apply search term filter', async () => {
      // Arrange
      const searchTerm = 'Test';
      const mockDbEvents = [
        {
          id: '1',
          title: 'Test Event',
          description: 'A test event',
          start_date_time: new Date().toISOString(),
          organizer_id: mockUser.id,
          community_id: mockCommunity.id,
          deleted_at: null,
          deleted_by: null,
        },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.or.mockResolvedValue({ data: mockDbEvents, error: null });

      // Act
      const result = await eventService.fetchEvents({ searchTerm });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toContain(searchTerm);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockQuery = QuerySetups.fetchEvents(mockSupabase, null);

      // Act
      const result = await eventService.fetchEvents();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const error = new Error('Database error');
      const mockQuery = QuerySetups.fetchEvents(mockSupabase, null, error);

      // Act & Assert
      await expect(eventService.fetchEvents()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('fetchEventById', () => {
    it('should return null when event not found', async () => {
      // Arrange
      const error = { code: 'PGRST116' }; // Not found error
      const mockQuery = QuerySetups.fetchEventById(mockSupabase, null, error);

      // Act
      const result = await eventService.fetchEventById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createEvent', () => {
    it('should create event when user is authenticated', async () => {
      // Arrange
      const eventData = {
        title: 'New Event',
        description: 'A new test event',
        startDateTime: new Date(),
        endDateTime: new Date(),
        location: 'Test Location',
        organizerId: mockUser.id,
        communityId: mockCommunity.id,
        tags: ['test'],
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock the insert query for creating the event
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockInsertQuery.single.mockResolvedValue({
        data: {
          id: 'new-event-id',
          organizer_id: mockUser.id,
          community_id: mockCommunity.id,
          title: eventData.title,
          description: eventData.description,
          start_date_time: eventData.startDateTime.toISOString(),
          end_date_time: eventData.endDateTime?.toISOString(),
          location: eventData.location,
          tags: eventData.tags,
          deleted_at: null,
          deleted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Services are already mocked in beforeEach

      vi.mocked(mockSupabase.from).mockReturnValue(mockInsertQuery as any);

      // Act
      const result = await eventService.createEvent(eventData);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
      expect(result.id).toBe('new-event-id');
      expect(result.title).toBe(eventData.title);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const eventData = {
        title: 'New Event',
        description: 'A new test event',
        startDateTime: new Date(),
        organizerId: mockUser.id,
        communityId: mockCommunity.id,
      };

      // Act & Assert
      await expect(eventService.createEvent(eventData)).rejects.toThrow(
        MESSAGE_AUTHENTICATION_REQUIRED
      );
    });
  });

  describe('updateEvent', () => {
    it('should update event when user is authenticated', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Event',
        description: 'Updated description',
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Services are already mocked in beforeEach

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.single.mockResolvedValue({
        data: {
          id: mockEvent.id,
          organizer_id: mockUser.id,
          community_id: mockCommunity.id,
          title: updateData.title,
          description: updateData.description,
          start_date_time: new Date().toISOString(),
          location: 'Test Location',
          deleted_at: null,
          deleted_by: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      });

      // Act
      const result = await eventService.updateEvent(mockEvent.id, updateData);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
      expect(result.title).toBe(updateData.title);
      expect(result.description).toBe(updateData.description);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const updateData = {
        title: 'Updated Event',
      };

      // Act & Assert
      await expect(
        eventService.updateEvent(mockEvent.id, updateData)
      ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });
  });

  describe('deleteEvent', () => {
    it('should hard delete event when user is authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock select query for checking event organizer
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockSelectQuery.single.mockResolvedValue({
        data: { organizer_id: mockUser.id },
        error: null,
      });

      // Mock delete query for hard delete
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      mockDeleteQuery.eq.mockResolvedValue({ error: null });

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockDeleteQuery as any);

      // Act
      await eventService.deleteEvent(mockEvent.id);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(eventService.deleteEvent(mockEvent.id)).rejects.toThrow(
        MESSAGE_AUTHENTICATION_REQUIRED
      );
    });
  });
});
