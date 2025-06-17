import type { Database } from '@belongnetwork/types/database';
import type {
  EventData,
  Event,
  User,
  Community,
  Coordinates,
} from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from '../../utils';

// Database types for events table (will be available once migrations are applied)
export type EventRow = Database['public']['Tables']['events']['Row'];
export type EventInsertDbData = Database['public']['Tables']['events']['Insert'];
export type EventUpdateDbData = Database['public']['Tables']['events']['Update'];

/**
 * Transform a database event record to a domain event object
 */
export function toDomainEvent(
  dbEvent: EventRow,
  refs: { organizer: User; community: Community }
): Event {
  const {
    organizer_id,
    community_id,
    start_date_time,
    end_date_time,
    coordinates,
    parking_info,
    max_attendees,
    registration_required,
    is_active,
    image_urls,
    created_at,
    updated_at,
    ...rest
  } = dbEvent;

  if (organizer_id !== refs.organizer.id) {
    throw new Error('Organizer ID does not match');
  }

  if (community_id !== refs.community.id) {
    throw new Error('Community ID does not match');
  }

  return {
    ...rest,
    id: dbEvent.id,
    title: rest.title,
    description: rest.description,
    startDateTime: new Date(start_date_time),
    endDateTime: end_date_time ? new Date(end_date_time) : undefined,
    location: rest.location,
    coordinates: parsePostGisPoint(coordinates),
    parkingInfo: parking_info || undefined,
    maxAttendees: max_attendees || undefined,
    registrationRequired: registration_required === true, // Default to false if not set
    isActive: is_active !== false, // Default to true if not set
    tags: rest.tags || [],
    imageUrls: image_urls || [],
    attendeeCount: rest.attendee_count || 0,
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    organizer: refs.organizer,
    community: refs.community,
  };
}

/**
 * Transform a domain event data object to a database event insert record
 */
export function forDbInsert(
  eventData: EventData,
  organizerId: string
): EventInsertDbData {
  const {
    communityId,
    organizerId: _organizerId,
    startDateTime,
    endDateTime,
    coordinates,
    parkingInfo,
    maxAttendees,
    registrationRequired,
    isActive,
    tags,
    imageUrls,
    ...rest
  } = eventData;

  return {
    ...rest,
    organizer_id: organizerId,
    community_id: communityId,
    start_date_time: startDateTime.toISOString(),
    end_date_time: endDateTime?.toISOString() || null,
    coordinates: toPostGisPoint(coordinates),
    parking_info: parkingInfo || null,
    max_attendees: maxAttendees || null,
    registration_required: registrationRequired || false,
    is_active: isActive !== false, // Default to true
    tags: tags || [],
    image_urls: imageUrls || [],
  };
}

/**
 * Transform a domain event data object to a database event update record
 */
export function forDbUpdate(
  eventData: Partial<EventData>,
  organizerId?: string
): EventUpdateDbData {
  const {
    communityId,
    organizerId: _organizerId,
    startDateTime,
    endDateTime,
    coordinates,
    parkingInfo,
    maxAttendees,
    registrationRequired,
    isActive,
    tags,
    imageUrls,
    ...rest
  } = eventData;

  return {
    ...rest,
    organizer_id: organizerId,
    community_id: communityId,
    start_date_time: startDateTime?.toISOString(),
    end_date_time: endDateTime?.toISOString() || null,
    coordinates: coordinates ? toPostGisPoint(coordinates) : undefined,
    parking_info: parkingInfo,
    max_attendees: maxAttendees,
    registration_required: registrationRequired,
    is_active: isActive,
    tags: tags,
    image_urls: imageUrls,
  };
}