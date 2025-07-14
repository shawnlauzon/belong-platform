import { Coordinates, IsPersisted } from '@/shared';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';

export type Gathering = IsPersisted<GatheringInput & GatheringSummaryFields>;
export type GatheringSummary = IsPersisted<GatheringSummaryFields>;

export type GatheringInput = Omit<
  GatheringSummaryFields,
  'organizer' | 'community' | 'attendeeCount'
> & {
  communityId: string;
};

type GatheringSummaryFields = {
  title: string;
  description: string;
  startDateTime: Date;
  endDateTime?: Date;
  organizerId: string;
  organizer: UserSummary;
  communityId: string;
  community: CommunitySummary;
  attendeeCount: number;
  maxAttendees?: number;
  coordinates: Coordinates;
  locationName: string;
  imageUrls?: string[];
};
