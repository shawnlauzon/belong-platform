import { IsPersisted } from '@/shared';
import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';

export type Shoutout = IsPersisted<ShoutoutInput & ShoutoutSummaryFields>;
export type ShoutoutSummary = ShoutoutSummaryFields & {
  id: string;
};

// For creating / updating Shoutout
export type ShoutoutInput = {
  message: string;
  resourceId: string;
  imageUrls?: string[];
};

export type ShoutoutInputRefs = {
  fromUserId: string;
  toUserId: string;
  communityId: string;
  resourceId?: string;
};

// Summary information about a Shoutout
type ShoutoutSummaryFields = {
  message: string;
  imageUrls: string[];
  fromUserId: string;
  fromUser: UserSummary;
  toUserId: string;
  toUser: UserSummary;
  communityId: string;
  community: CommunitySummary;
  resource?: ResourceSummary;
  resourceId: string;
};
