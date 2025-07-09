import { ResourceDetail } from '../../resources';
import { UserDetail } from '../../users';

export interface ShoutoutData {
  toUserId: string;
  resourceId: string;
  message: string;
  imageUrls?: string[];
  impactDescription?: string;
}

export interface ShoutoutDetail extends ShoutoutData {
  id: string;
  fromUserId: string;
  fromUser: UserDetail;
  toUser: UserDetail;
  resource: ResourceDetail;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoutoutFilter {
  communityId?: string;
  communityIds?: string[];
  sentBy?: string;
  receivedBy?: string;
  resourceId?: string;
  page?: number;
  pageSize?: number;
}

export interface ShoutoutInfo extends ShoutoutData {
  id: string;
  fromUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
