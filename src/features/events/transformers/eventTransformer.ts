import type { EventData, Event, EventInfo } from '../types';
import { parsePostGisPoint, toPostGisPoint } from '../../../api/utils';
import { User } from '../../users';
import { Community } from '../../communities';
import {
  EventInsertDbData,
  EventRow,
  EventUpdateDbData,
} from '../types/database';

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
    is_all_day,
    image_urls,
    attendee_count,
    deleted_at,
    deleted_by,
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
    maxAttendees: max_attendees || undefined,
    registrationRequired: registration_required === true, // Default to false if not set
    isAllDay: is_all_day === true, // Default to false if not set
    tags: rest.tags || [],
    imageUrls: image_urls || [],
    attendeeCount: attendee_count || 0,
    deletedAt: deleted_at ? new Date(deleted_at) : undefined,
    deletedBy: deleted_by || undefined,
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
    startDateTime,
    endDateTime,
    coordinates,
    maxAttendees,
    registrationRequired,
    isAllDay,
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
    coordinates: coordinates ? toPostGisPoint(coordinates) : null,
    max_attendees: maxAttendees || null,
    registration_required: registrationRequired || false,
    is_all_day: isAllDay || false,
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
    startDateTime,
    endDateTime,
    coordinates,
    maxAttendees,
    registrationRequired,
    isAllDay,
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
    max_attendees: maxAttendees,
    registration_required: registrationRequired,
    is_all_day: isAllDay,
    tags: tags,
    image_urls: imageUrls,
  };
}

/**
 * Transform a database event record to an EventInfo object (lightweight for lists)
 */
export function toEventInfo(
  dbEvent: EventRow,
  organizerId: string,
  communityId: string
): EventInfo {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    startDateTime: new Date(dbEvent.start_date_time),
    endDateTime: dbEvent.end_date_time
      ? new Date(dbEvent.end_date_time)
      : undefined,
    location: dbEvent.location,
    coordinates: parsePostGisPoint(dbEvent.coordinates),
    maxAttendees: dbEvent.max_attendees || undefined,
    registrationRequired: dbEvent.registration_required === true, // Default to false if not set
    isAllDay: dbEvent.is_all_day === true, // Default to false if not set
    tags: dbEvent.tags || [],
    imageUrls: dbEvent.image_urls || [],
    attendeeCount: dbEvent.attendee_count || 0,
    deletedAt: dbEvent.deleted_at ? new Date(dbEvent.deleted_at) : undefined,
    deletedBy: dbEvent.deleted_by || undefined,
    createdAt: new Date(dbEvent.created_at),
    updatedAt: new Date(dbEvent.updated_at),
    organizerId: organizerId,
    communityId: communityId,
  };
}
