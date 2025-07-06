import { Coordinates } from '@/shared';
import { Community } from '../../communities';
import { User } from '../../users';

export interface Event
  extends Omit<EventData, 'organizerId' | 'communityId'> {
  id: string;
  organizer: User;
  community: Community;
  attendees?: User[];
  attendeeCount: number;
  createdAt: Date;
  updatedAt: Date;
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
  maxAttendees?: number;
  registrationRequired: boolean;
  imageUrls?: string[];
  tags?: string[];
  parkingInfo?: string;
}

export interface EventInfo extends Omit<Event, 'organizer' | 'community' | 'attendees'> {
  organizerId: string;
  communityId: string;
}

export interface EventFilter {
  communityId?: string;
  organizerId?: string;
  startAfter?: Date;
  startBefore?: Date;
  tags?: string[];
  isRegistrationRequired?: boolean;
  hasAvailableSpots?: boolean;
  searchTerm?: string;
}

export interface EventAttendance {
  id: string;
  eventId: string;
  userId: string;
  status: 'attending' | 'not_attending' | 'maybe';
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttendanceData {
  eventId: string;
  userId: string;
  status: 'attending' | 'not_attending' | 'maybe';
}