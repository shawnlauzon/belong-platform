import { Coordinates } from '@/shared';
import { CommunityDetail } from '../../communities';
import { UserDetail } from '../../users';

export interface EventDetail
  extends Omit<EventData, 'organizerId' | 'communityId'> {
  id: string;
  organizer: UserDetail;
  community: CommunityDetail;
  attendees?: UserDetail[];
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
  imageUrls?: string[];
}

export interface EventInfo
  extends Omit<EventDetail, 'organizer' | 'community' | 'attendees'> {
  organizerId: string;
  communityId: string;
}

export interface EventFilter {
  communityId?: string;
  organizerId?: string;
  startAfter?: Date;
  startBefore?: Date;
  searchTerm?: string;
}

export interface EventAttendance {
  eventId: string;
  userId: string;
  status: 'attending' | 'not_attending' | 'maybe';
  createdAt: Date;
  updatedAt: Date;
  user?: UserDetail;
}

export interface EventAttendanceData {
  eventId: string;
  userId: string;
  status: 'attending' | 'not_attending' | 'maybe';
}
