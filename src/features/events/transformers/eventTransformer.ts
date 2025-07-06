import type {
  Event,
  EventData,
  EventInfo,
  EventAttendance,
  EventAttendanceData,
} from '../types';
import type {
  EventRow,
  EventInsert,
  EventUpdate,
  EventAttendanceRow,
  EventAttendanceInsert,
} from '../types/database';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { User } from '../../users';
import { Community } from '../../communities';

/**
 * Transform a database event record to a domain event object
 */
export function toDomainEvent(
  dbEvent: EventRow,
  refs: { organizer: User; community: Community; attendees?: User[] },
): Event {
  if (dbEvent.organizer_id !== refs.organizer.id) {
    throw new Error('Organizer ID does not match');
  }

  if (dbEvent.community_id !== refs.community.id) {
    throw new Error('Community ID does not match');
  }

  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    startDateTime: new Date(dbEvent.start_date_time),
    endDateTime: dbEvent.end_date_time ? new Date(dbEvent.end_date_time) : undefined,
    isAllDay: dbEvent.is_all_day,
    location: dbEvent.location,
    coordinates: parsePostGisPoint(dbEvent.coordinates),
    maxAttendees: dbEvent.max_attendees ?? undefined,
    registrationRequired: dbEvent.registration_required,
    imageUrls: dbEvent.image_urls || [],
    tags: dbEvent.tags || [],
    parkingInfo: dbEvent.parking_info ?? undefined,
    attendeeCount: dbEvent.attendee_count,
    createdAt: new Date(dbEvent.created_at),
    updatedAt: new Date(dbEvent.updated_at),
    organizer: refs.organizer,
    community: refs.community,
    attendees: refs.attendees,
  };
}

/**
 * Transform a domain event object to a database event record for insert
 */
export function forDbInsert(event: EventData): EventInsert {
  return {
    title: event.title,
    description: event.description,
    community_id: event.communityId,
    organizer_id: event.organizerId,
    start_date_time: event.startDateTime.toISOString(),
    end_date_time: event.endDateTime?.toISOString() || null,
    is_all_day: event.isAllDay,
    location: event.location,
    coordinates: toPostGisPoint(event.coordinates),
    max_attendees: event.maxAttendees ?? null,
    registration_required: event.registrationRequired,
    image_urls: event.imageUrls || [],
    tags: event.tags || [],
    parking_info: event.parkingInfo ?? null,
  };
}

/**
 * Transform a domain event object to a database event record for update
 */
export function forDbUpdate(event: Partial<EventData>): EventUpdate {
  return {
    title: event.title,
    description: event.description,
    start_date_time: event.startDateTime?.toISOString(),
    end_date_time: event.endDateTime?.toISOString() || null,
    is_all_day: event.isAllDay,
    location: event.location,
    coordinates: event.coordinates ? toPostGisPoint(event.coordinates) : undefined,
    max_attendees: event.maxAttendees ?? null,
    registration_required: event.registrationRequired,
    image_urls: event.imageUrls || [],
    tags: event.tags || [],
    parking_info: event.parkingInfo ?? null,
  };
}

/**
 * Transform a database event record to an EventInfo object (lightweight for lists)
 */
export function toEventInfo(dbEvent: EventRow): EventInfo {
  return {
    id: dbEvent.id,
    title: dbEvent.title,
    description: dbEvent.description,
    startDateTime: new Date(dbEvent.start_date_time),
    endDateTime: dbEvent.end_date_time ? new Date(dbEvent.end_date_time) : undefined,
    isAllDay: dbEvent.is_all_day,
    location: dbEvent.location,
    coordinates: parsePostGisPoint(dbEvent.coordinates),
    maxAttendees: dbEvent.max_attendees ?? undefined,
    registrationRequired: dbEvent.registration_required,
    imageUrls: dbEvent.image_urls || [],
    tags: dbEvent.tags || [],
    parkingInfo: dbEvent.parking_info ?? undefined,
    attendeeCount: dbEvent.attendee_count,
    createdAt: new Date(dbEvent.created_at),
    updatedAt: new Date(dbEvent.updated_at),
    organizerId: dbEvent.organizer_id,
    communityId: dbEvent.community_id,
  };
}

/**
 * Transform a database event attendance record to a domain event attendance object
 */
export function toDomainEventAttendance(
  dbAttendance: EventAttendanceRow,
): EventAttendance {
  return {
    id: dbAttendance.id,
    eventId: dbAttendance.event_id,
    userId: dbAttendance.user_id,
    status: dbAttendance.status as 'attending' | 'not_attending' | 'maybe',
    createdAt: new Date(dbAttendance.created_at),
    updatedAt: new Date(dbAttendance.updated_at),
  };
}

/**
 * Transform a domain event attendance object to a database event attendance record for insert
 */
export function forDbInsertAttendance(attendance: EventAttendanceData): EventAttendanceInsert {
  return {
    event_id: attendance.eventId,
    user_id: attendance.userId,
    status: attendance.status,
  };
}