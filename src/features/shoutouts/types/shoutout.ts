import { IsPersisted } from '@/shared';

export type Shoutout = IsPersisted<ShoutoutInput>;

// For creating / updating Shoutout
export type ShoutoutInput = {
  message: string;
  resourceId: string;
  imageUrls: string[];
  fromUserId: string;
  toUserId: string;
  communityId: string;
};

export type ShoutoutInputRefs = {
  fromUserId: string;
  toUserId: string;
  communityId: string;
  resourceId?: string;
};
