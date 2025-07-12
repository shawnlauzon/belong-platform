import { IsPersisted } from '@/shared';
import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';

export type Shoutout = IsPersisted<ShoutoutInput & ShoutoutSummaryFields>;
export type ShoutoutSummary = IsPersisted<ShoutoutSummaryFields>;

// For creating / updating Shoutout
export type ShoutoutInput = Omit<
  ShoutoutSummaryFields,
  'fromUserId' | 'fromUser' | 'toUser' | 'resource' | 'community'
> & {
  toUserId: string;
  resourceId: string;
  communityId: string;
};

// Summary information about a Shoutout
type ShoutoutSummaryFields = {
  message: string;
  imageUrls?: string[];
  fromUserId: string;
  fromUser: UserSummary;
  toUser: UserSummary;
  resource: ResourceSummary;
  community: CommunitySummary;
};
