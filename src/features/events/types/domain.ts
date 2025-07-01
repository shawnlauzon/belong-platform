import { Coordinates } from '../../../shared';
import { Community } from '../../communities';
import { User } from '../../users';

export enum EventAttendanceStatus {
  ATTENDING = 'attending',
  NOT_ATTENDING = 'not_attending',
  MAYBE = 'maybe',
}

export interface EventData {
  title: string;
  description: string;
  communityId: string;
  organizerId: string;
  startDateTime: Date;
  endDateTime?: Date;
  isAllDay: boolean;
  location: string;
  coordinates: Coordinates;
  parkingInfo?: string;
  maxAttendees?: number;
  registrationRequired?: boolean;
  isActive?: boolean;
  tags?: string[];
  imageUrls?: string[];
}

export interface Event extends Omit<EventData, 'communityId' | 'organizerId'> {
  id: string;
  community: Community;
  organizer: User;
  attendeeCount: number;
  registrationRequired: boolean;
  isActive: boolean;
  tags: string[];
  imageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
  // Optional current user's attendance status
  currentUserAttendance?: EventAttendance;
}

export interface EventInfo extends Omit<Event, 'community' | 'organizer'> {
  communityId: string;
  organizerId: string;
}

export interface EventFilter {
  communityId?: string;
  organizerId?: string;
  startDate?: Date;
  endDate?: Date;
  isActive?: boolean;
  tags?: string[];
  maxDriveMinutes?: number;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

export interface EventAttendanceData {
  eventId: string;
  userId: string;
  status: EventAttendanceStatus;
}

export interface EventAttendance extends EventAttendanceData {
  id: string;
  event: Event;
  user: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendanceFilter {
  eventId?: string;
  userId?: string;
  status?: EventAttendanceStatus;
  page?: number;
  pageSize?: number;
}
