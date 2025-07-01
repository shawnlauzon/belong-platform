import { describe, it, expect } from 'vitest';
import { toEventInfo } from '../transformers/eventTransformer';
import { createMockDbEvent } from '../__mocks__';
import { 
  assertNoSnakeCaseProperties, 
  COMMON_SNAKE_CASE_PROPERTIES 
} from '../../../shared/__test__/transformerTestUtils';

describe('EventInfo Transformer', () => {
  it('should transform database event to EventInfo without snake_case properties', () => {
    // Arrange
    const dbEvent = createMockDbEvent({
      id: 'event-123',
      title: 'Test Event',
      description: 'A test event',
      organizer_id: 'user-123',
      community_id: 'community-123',
      start_date_time: '2024-06-01T18:00:00Z',
      end_date_time: '2024-06-01T20:00:00Z',
      location: 'Test Location',
      coordinates: 'POINT(-73.9857 40.7484)',
      parking_info: 'Street parking available',
      max_attendees: 50,
      registration_required: true,
      is_active: true,
      tags: ['social', 'outdoor'],
      image_urls: ['event1.jpg', 'event2.jpg'],
      attendee_count: 25,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    });

    // Act
    const result = toEventInfo(dbEvent, 'user-123', 'community-123');

    // Assert - Should have camelCase properties
    expect(result).toHaveProperty('id', 'event-123');
    expect(result).toHaveProperty('title', 'Test Event');
    expect(result).toHaveProperty('description', 'A test event');
    expect(result).toHaveProperty('organizerId', 'user-123');
    expect(result).toHaveProperty('communityId', 'community-123');
    expect(result).toHaveProperty('startDateTime');
    expect(result).toHaveProperty('endDateTime');
    expect(result).toHaveProperty('location', 'Test Location');
    expect(result).toHaveProperty('coordinates');
    expect(result).toHaveProperty('parkingInfo', 'Street parking available');
    expect(result).toHaveProperty('maxAttendees', 50);
    expect(result).toHaveProperty('registrationRequired', true);
    expect(result).toHaveProperty('isActive', true);
    expect(result).toHaveProperty('tags', ['social', 'outdoor']);
    expect(result).toHaveProperty('imageUrls', ['event1.jpg', 'event2.jpg']);
    expect(result).toHaveProperty('attendeeCount', 25);
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');

    // Assert - Should NOT have snake_case properties
    assertNoSnakeCaseProperties(result, [
      ...COMMON_SNAKE_CASE_PROPERTIES.ENTITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.USER_COMMUNITY_FIELDS,
      ...COMMON_SNAKE_CASE_PROPERTIES.EVENT_FIELDS
    ]);

    // Assert - Should not have nested objects
    expect(result).not.toHaveProperty('organizer');
    expect(result).not.toHaveProperty('community');
  });

  it('should handle optional fields correctly in EventInfo', () => {
    // Arrange
    const dbEvent = createMockDbEvent({
      id: 'event-456',
      title: 'Minimal Event',
      description: 'Basic event',
      organizer_id: 'user-456',
      community_id: 'community-456',
      start_date_time: '2024-06-01T18:00:00Z',
      end_date_time: null,
      location: 'Basic Location',
      coordinates: 'POINT(0 0)',
      parking_info: null,
      max_attendees: null,
      registration_required: false,
      is_active: true,
      tags: [],
      image_urls: [],
      attendee_count: 0,
    });

    // Act
    const result = toEventInfo(dbEvent, 'user-456', 'community-456');

    // Assert
    expect(result.endDateTime).toBeUndefined();
    expect(result.parkingInfo).toBeUndefined();
    expect(result.maxAttendees).toBeUndefined();
    expect(result.registrationRequired).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.tags).toEqual([]);
    expect(result.imageUrls).toEqual([]);
    expect(result.attendeeCount).toBe(0);

    // Verify no snake_case leakage  
    assertNoSnakeCaseProperties(result, [
      'end_date_time',
      'parking_info', 
      'max_attendees',
      'registration_required',
      'is_active',
      'image_urls',
      'attendee_count'
    ]);
  });
});
