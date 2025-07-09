import { ResourceDetail } from '../../resources';
import { UserDetail } from '../../users';

export interface ShoutoutData {
  fromUserId: string;
  toUserId: string;
  resourceId: string;
  message: string;
  imageUrls?: string[];
  impactDescription?: string;
}

export interface Shoutout
  extends Omit<ShoutoutData, 'fromUserId' | 'toUserId' | 'resourceId'> {
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
  extends Omit<Shoutout, 'fromUser' | 'toUser' | 'resource'> {
  fromUserId: string; // Replaces fromUser: User
  toUserId: string; // Replaces toUser: User
  resourceId: string; // Replaces resource: Resource
}