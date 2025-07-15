import { IsPersisted } from '@/shared';
import { ResourceSummary } from '../../resources';
import { UserSummary } from '../../users';
import { CommunitySummary } from '@/features/communities/types/community';
import { GatheringSummary } from '../../gatherings';

export type Shoutout = IsPersisted<ShoutoutInput & ShoutoutSummaryFields>;
export type ShoutoutSummary = IsPersisted<ShoutoutSummaryFields>;

// For creating / updating Shoutout
type ShoutoutInput = {
  message: string;
  imageUrls?: string[];
};

export type ShoutoutInputRefs = {
  fromUserId: string;
  toUserId: string;
  communityId: string;
  resourceId?: string;
  gatheringId?: string;
};

export type ShoutoutResourceInput = ShoutoutInput & {
  resourceId: string;
};

export type ShoutoutGatheringInput = ShoutoutInput & {
  gatheringId: string;
};

// Summary information about a Shoutout
type ShoutoutSummaryFields = {
  message: string;
  imageUrls?: string[];
  fromUserId: string;
  fromUser: UserSummary;
  toUserId: string;
  toUser: UserSummary;
  communityId: string;
  community: CommunitySummary;
} & (
  | { resource: ResourceSummary; resourceId: string; gathering?: never }
  | { gathering: GatheringSummary; resource?: never }
);

// type guards
export function isShoutoutResourceInput(
  input: ShoutoutInput,
): input is ShoutoutResourceInput {
  return 'resourceId' in input;
}

export function isShoutoutGatheringInput(
  input: ShoutoutInput,
): input is ShoutoutGatheringInput {
  return 'gatheringId' in input;
}
