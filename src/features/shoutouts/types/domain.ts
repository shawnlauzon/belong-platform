import { ResourceDetail } from '../../resources';
import { UserDetail } from '../../users';

export interface ShoutoutData {
  toUserId: string;
  resourceId: string;
  message: string;
  imageUrls?: string[];
}

export interface ShoutoutDetail
  extends Omit<ShoutoutData, 'toUserId' | 'resourceId'> {
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

export interface ShoutoutInfo
  extends Omit<ShoutoutDetail, 'fromUser' | 'toUser' | 'resource'> {
  fromUserId: string; // Replaces fromUser: User
  toUserId: string; // Replaces toUser: User
  resourceId: string; // Replaces resource: Resource
}
