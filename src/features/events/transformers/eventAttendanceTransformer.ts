import { User } from '../../users';
import type {
  EventAttendanceData,
  EventAttendance,
  EventAttendanceStatus,
  Event,
} from '../types';
import {
  EventAttendanceInsertDbData,
  EventAttendanceRow,
  EventAttendanceUpdateDbData,
} from '../types/db';

/**
 * Transform a database event attendance record to a domain event attendance object
 */
export function toDomainEventAttendance(
  dbAttendance: EventAttendanceRow,
  refs: { user: User; event: Event }
): EventAttendance {
  const { event_id, user_id, created_at, updated_at, ...rest } = dbAttendance;

  if (event_id !== refs.event.id) {
    throw new Error('Event ID does not match');
  }

  if (user_id !== refs.user.id) {
    throw new Error('User ID does not match');
  }

  return {
    ...rest,
    id: dbAttendance.id,
    eventId: event_id,
    userId: user_id,
    status: rest.status as EventAttendanceStatus,
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    user: refs.user,
    event: refs.event,
  };
}

/**
 * Transform a domain event attendance data object to a database event attendance insert record
 */
export function forDbInsert(
  attendanceData: EventAttendanceData,
  userId: string
): EventAttendanceInsertDbData {
  return {
    event_id: attendanceData.eventId,
    user_id: userId,
    status: attendanceData.status,
  };
}

/**
 * Transform a domain event attendance data object to a database event attendance update record
 */
export function forDbUpdate(
  attendanceData: Partial<EventAttendanceData>
): EventAttendanceUpdateDbData {
  return {
    status: attendanceData.status,
  };
}
