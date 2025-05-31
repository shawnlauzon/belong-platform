import { Resource } from './index';

export interface BaseEvent {
  id: string;
  timestamp: number;
  userId?: string;
  communityId?: string;
  source: 'user' | 'system' | 'api';
}

export interface ResourceCreateRequestedEvent extends BaseEvent {
  type: 'resource.create.requested';
  data: Omit<Resource, 'id' | 'created_at' | 'times_helped'>;
}

export interface ResourceCreatedEvent extends BaseEvent {
  type: 'resource.created';
  data: Resource;
}

export type AppEvent = 
  | ResourceCreateRequestedEvent
  | ResourceCreatedEvent;