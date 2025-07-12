import { Coordinates, IsPersisted } from '@/shared';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';

export type Gathering = IsPersisted<GatheringInput & GatheringSummaryFields>;
export type GatheringSummary = IsPersisted<GatheringSummaryFields>;

export type GatheringInput = Omit<
  GatheringSummaryFields,
  'organizer' | 'community' | 'attendeeCount'
> & {
  description: string;
  communityId: string;
  endDateTime?: Date;
  isAllDay: boolean;
  maxAttendees?: number;
};

type GatheringSummaryFields = {
  title: string;
  startDateTime: Date;
  organizerId: string;
  organizer: UserSummary;
  communityId: string;
  community: CommunitySummary;
  attendeeCount: number;
  coordinates: Coordinates;
  locationName: string;
  imageUrls?: string[];
};
