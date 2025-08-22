import { IsPersisted } from '@/shared';

export type Shoutout = IsPersisted<ShoutoutInput> & {
  senderId: string;
  commentCount: number;
};

// For creating / updating Shoutout
export type ShoutoutInput = {
  message: string;
  receiverId: string;
  resourceId: string;
  imageUrls?: string[];
  communityId: string;
};
