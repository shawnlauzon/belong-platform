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
  fromUser: UserDetail;
  toUser: UserDetail;
  resource: ResourceDetail;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoutoutFilter {
  sentBy?: string;
  receivedBy?: string;
  resourceId?: string;
  page?: number;
  pageSize?: number;
}

export interface ShoutoutInfo extends ShoutoutDetail {
  fromUserId: string;
  createdAt: Date;
  updatedAt: Date;
}
