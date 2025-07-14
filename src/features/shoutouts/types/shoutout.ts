import { IsPersisted } from '@/shared';
import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';
import { GatheringSummary } from '../../gatherings';

export type Shoutout = IsPersisted<ShoutoutInput & ShoutoutSummaryFields>;
export type ShoutoutSummary = IsPersisted<ShoutoutSummaryFields>;

// For creating / updating Shoutout
export type ShoutoutInput = Omit<
  ShoutoutSummaryFields,
  'fromUserId' | 'fromUser' | 'toUser' | 'resource' | 'gathering' | 'community'
> & {
  // TODO this is also optional, it should be either resource or gathering or user
  toUserId: string;
  communityId: string;
} & (
    | { resourceId: string; gatheringId?: never }
    | { gatheringId: string; resourceId?: never }
  );

// Summary information about a Shoutout
type ShoutoutSummaryFields = {
  message: string;
  imageUrls?: string[];
  fromUserId: string;
  fromUser: UserSummary;
  toUser: UserSummary;
  community: CommunitySummary;
} & (
  | { resource: ResourceSummary; gathering?: never }
  | { gathering: GatheringSummary; resource?: never }
);
