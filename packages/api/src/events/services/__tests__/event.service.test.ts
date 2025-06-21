import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventService } from '../event.service';
import { logger } from '@belongnetwork/core';
import type { EventData, EventFilter } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../../constants';

// Mock the logger
vi.mock('@belongnetwork/core', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the transformers
vi.mock('../../impl/eventTransformer', () => ({
  toEventInfo: vi.fn(),
  toDomainEvent: vi.fn(),
  forDbInsert: vi.fn(),
  forDbUpdate: vi.fn(),
  toDomainEventAttendance: vi.fn(),
  forDbAttendanceInsert: vi.fn(),
}));

// Mock the other services
vi.mock('../../../users/services/user.service', () => ({
  createUserService: vi.fn(),
}));

vi.mock('../../../communities/services/community.service', () => ({
  createCommunityService: vi.fn(),
}));

import { 
  toEventInfo, 
  toDomainEvent, 
  forDbInsert, 
  forDbUpdate,
  toDomainEventAttendance,
  forDbAttendanceInsert
} from '../../impl/eventTransformer';
import { createUserService } from '../../../users/services/user.service';
import { createCommunityService } from '../../../communities/services/community.service';

const mockLogger = vi.mocked(logger);
const mockToEventInfo = vi.mocked(toEventInfo);
const mockToDomainEvent = vi.mocked(toDomainEvent);
const mockForDbInsert = vi.mocked(forDbInsert);
const mockForDbUpdate = vi.mocked(forDbUpdate);
const mockToDomainEventAttendance = vi.mocked(toDomainEventAttendance);
const mockForDbAttendanceInsert = vi.mocked(forDbAttendanceInsert);
const mockCreateUserService = vi.mocked(createUserService);
const mockCreateCommunityService = vi.mocked(createCommunityService);

describe('EventService', () => {
  let mockSupabase: any;
  let eventService: ReturnType<typeof createEventService>;

  const mockDbEvent = {
    id: 'event-123',
    title: 'Test Event',
    description: 'Test Description',
    organizer_id: 'user-123',
    community_id: 'community-123',
    start_date_time: '2024-12-25T10:00:00Z',
    end_date_time: '2024-12-25T12:00:00Z',
    location: 'Test Location',
    max_attendees: 50,
    is_active: true,
    tags: ['social', 'community'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockEventInfo = {
    id: 'event-123',
    title: 'Test Event',
    description: 'Test Description',
    organizerId: 'user-123',
    communityId: 'community-123',
    startDateTime: new Date('2024-12-25T10:00:00Z'),
    endDateTime: new Date('2024-12-25T12:00:00Z'),
    location: 'Test Location',
    maxAttendees: 50,
    isActive: true,
    tags: ['social', 'community'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCommunity = {
    id: 'community-123',
    name: 'Test Community',
    description: 'Test Description',
    level: 'city' as const,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockEvent = {
    id: 'event-123',
    title: 'Test Event',
    description: 'Test Description',
    organizer: mockUser,
    community: mockCommunity,
    startDateTime: new Date('2024-12-25T10:00:00Z'),
    endDateTime: new Date('2024-12-25T12:00:00Z'),
    location: 'Test Location',
    maxAttendees: 50,
    isActive: true,
    tags: ['social', 'community'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockEventAttendance = {
    id: 'attendance-123',
    eventId: 'event-123',
    user: mockUser,
    status: 'attending',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    };

    eventService = createEventService(mockSupabase);

    // Setup default transformer mocks
    mockToEventInfo.mockReturnValue(mockEventInfo);
    mockToDomainEvent.mockReturnValue(mockEvent);
    mockForDbInsert.mockReturnValue(mockDbEvent);
    mockForDbUpdate.mockReturnValue(mockDbEvent);
    mockToDomainEventAttendance.mockReturnValue(mockEventAttendance);
    mockForDbAttendanceInsert.mockReturnValue({
      event_id: 'event-123',
      user_id: 'user-123',
      status: 'attending',
    });

    // Setup service mocks
    const mockUserService = {
      fetchUserById: vi.fn().mockResolvedValue(mockUser),
    };
    const mockCommunityService = {
      fetchCommunityById: vi.fn().mockResolvedValue(mockCommunity),
    };
    mockCreateUserService.mockReturnValue(mockUserService as any);
    mockCreateCommunityService.mockReturnValue(mockCommunityService as any);
  });

  describe('fetchEvents', () => {
    it('should fetch events successfully', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEvents();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('start_date_time', { ascending: true });
      expect(mockToEventInfo).toHaveBeenCalledWith(mockDbEvent, 0, [mockDbEvent]);
      expect(result).toEqual([mockEventInfo]);
      expect(mockLogger.debug).toHaveBeenCalledWith('🎉 Event Service: Fetching events', { filters: undefined });
    });

    it('should apply community filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: EventFilter = { communityId: 'community-123' };

      // Act
      const result = await eventService.fetchEvents(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('community_id', 'community-123');
      expect(result).toEqual([mockEventInfo]);
    });

    it('should apply organizer filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: EventFilter = { organizerId: 'user-123' };

      // Act
      const result = await eventService.fetchEvents(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('organizer_id', 'user-123');
      expect(result).toEqual([mockEventInfo]);
    });

    it('should apply date range filters when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const startDate = new Date('2024-12-01T00:00:00Z');
      const endDate = new Date('2024-12-31T23:59:59Z');
      const filters: EventFilter = { startDate, endDate };

      // Act
      const result = await eventService.fetchEvents(filters);

      // Assert
      expect(mockQuery.gte).toHaveBeenCalledWith('start_date_time', startDate.toISOString());
      expect(mockQuery.lte).toHaveBeenCalledWith('start_date_time', endDate.toISOString());
      expect(result).toEqual([mockEventInfo]);
    });

    it('should apply tags filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: EventFilter = { tags: ['social', 'community'] };

      // Act
      const result = await eventService.fetchEvents(filters);

      // Assert
      expect(mockQuery.overlaps).toHaveBeenCalledWith('tags', ['social', 'community']);
      expect(result).toEqual([mockEventInfo]);
    });

    it('should apply search term filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbEvent], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: EventFilter = { searchTerm: 'test' };

      // Act
      const result = await eventService.fetchEvents(filters);

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%test%,description.ilike.%test%');
      expect(result).toEqual([mockEventInfo]);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockQueryResult = { data: [], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEvents();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEvents();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.fetchEvents()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🎉 Event Service: Failed to fetch events', { error: dbError });
    });
  });

  describe('fetchEventById', () => {
    it('should fetch event by ID successfully', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbEvent, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEventById('event-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockCreateUserService).toHaveBeenCalledWith(mockSupabase);
      expect(mockCreateCommunityService).toHaveBeenCalledWith(mockSupabase);
      expect(mockToDomainEvent).toHaveBeenCalledWith(mockDbEvent, mockUser, mockCommunity);
      expect(result).toEqual(mockEvent);
    });

    it('should return null when event not found', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: { code: 'PGRST116' } };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEventById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle event without community', async () => {
      // Arrange
      const eventWithoutCommunity = { ...mockDbEvent, community_id: null };
      const mockQueryResult = { data: eventWithoutCommunity, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEventById('event-123');

      // Assert
      expect(mockToDomainEvent).toHaveBeenCalledWith(eventWithoutCommunity, mockUser, undefined);
      expect(result).toEqual(mockEvent);
    });

    it('should throw error when organizer not found', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbEvent, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const mockUserService = {
        fetchUserById: vi.fn().mockResolvedValue(null),
      };
      mockCreateUserService.mockReturnValue(mockUserService as any);

      // Act & Assert
      await expect(eventService.fetchEventById('event-123')).rejects.toThrow('Organizer not found');
    });

    it('should throw database errors other than not found', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.fetchEventById('event-123')).rejects.toThrow(dbError);
    });
  });

  describe('createEvent', () => {
    const mockEventData: EventData = {
      title: 'New Event',
      description: 'A new event',
      startDateTime: new Date('2024-12-25T10:00:00Z'),
      endDateTime: new Date('2024-12-25T12:00:00Z'),
      location: 'Test Location',
      communityId: 'community-123',
      maxAttendees: 50,
      tags: ['social'],
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should create event successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsertResult = { data: mockDbEvent, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.createEvent(mockEventData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbInsert).toHaveBeenCalledWith(mockEventData, 'user-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.insert).toHaveBeenCalledWith([mockDbEvent]);
      expect(mockToDomainEvent).toHaveBeenCalledWith(mockDbEvent, expect.any(Object), expect.any(Object));
      expect(result).toEqual(mockEvent);
      expect(mockLogger.info).toHaveBeenCalledWith('🎉 Event Service: Successfully created event', {
        id: mockEvent.id,
        title: mockEvent.title,
        organizerId: mockEvent.organizer.id,
        communityId: mockEvent.community?.id,
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(eventService.createEvent(mockEventData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Insert failed');
      const mockInsertResult = { data: null, error: dbError };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.createEvent(mockEventData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🎉 Event Service: Failed to create event', { error: dbError });
    });
  });

  describe('updateEvent', () => {
    const mockUpdateData = {
      title: 'Updated Event',
      description: 'Updated description',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should update event successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateResult = { data: mockDbEvent, error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.updateEvent('event-123', mockUpdateData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockToDomainEvent).toHaveBeenCalledWith(mockDbEvent, expect.any(Object), expect.any(Object));
      expect(result).toEqual(mockEvent);
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(eventService.updateEvent('event-123', mockUpdateData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Update failed');
      const mockUpdateResult = { data: null, error: dbError };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.updateEvent('event-123', mockUpdateData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🎉 Event Service: Failed to update event', { id: 'event-123', error: dbError });
    });
  });

  describe('deleteEvent', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should soft delete event successfully when user is organizer', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the fetch query for ownership check
      const mockFetchResult = { data: { organizer_id: 'user-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      // Mock the update query for soft delete
      const mockUpdateResult = { error: null };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFetchQuery) // First call for ownership check
        .mockReturnValueOnce(mockUpdateQuery); // Second call for update

      // Act
      const result = await eventService.deleteEvent('event-123');

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('events');
      expect(mockFetchQuery.select).toHaveBeenCalledWith('organizer_id');
      expect(mockFetchQuery.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'event-123');
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('🎉 Event Service: Successfully deleted event', {
        id: 'event-123',
      });
    });

    it('should return early when event not found', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: null, error: { code: 'PGRST116' } };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act
      const result = await eventService.deleteEvent('nonexistent-event');

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('🎉 Event Service: Event not found for deletion', {
        id: 'nonexistent-event',
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(eventService.deleteEvent('event-123')).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when user is not the organizer', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: { organizer_id: 'other-user' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act & Assert
      await expect(eventService.deleteEvent('event-123')).rejects.toThrow('You are not authorized to delete this event');
    });
  });

  describe('fetchEventAttendees', () => {
    const mockDbAttendance = {
      id: 'attendance-123',
      event_id: 'event-123',
      user_id: 'user-123',
      status: 'attending',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should fetch event attendees successfully', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbAttendance], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters = { eventId: 'event-123' };

      // Act
      const result = await eventService.fetchEventAttendees(filters);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('event_attendances');
      expect(mockQuery.eq).toHaveBeenCalledWith('event_id', 'event-123');
      expect(mockCreateUserService).toHaveBeenCalledWith(mockSupabase);
      expect(mockToDomainEventAttendance).toHaveBeenCalledWith(mockDbAttendance, mockUser);
      expect(result).toEqual([mockEventAttendance]);
    });

    it('should handle empty attendees list', async () => {
      // Arrange
      const mockQueryResult = { data: [], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await eventService.fetchEventAttendees({});

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(eventService.fetchEventAttendees({})).rejects.toThrow(dbError);
    });
  });
});