import { Resource, ResourceFilter } from '@belongnetwork/core/types/entities';
import { BaseEvent } from '@belongnetwork/core/types/events';

// Resource Fetch Events
export interface ResourceFetchRequestedEvent extends BaseEvent {
  type: 'resource.fetch.requested';
  data: {
    filters?: ResourceFilter;
  };
}

export interface ResourceFetchSuccessEvent extends BaseEvent {
  type: 'resource.fetch.success';
  data: {
    resources: Resource[];
  };
}

export interface ResourceFetchFailedEvent extends BaseEvent {
  type: 'resource.fetch.failed';
  data: {
    error: string;
  };
}

// Resource Create Events (existing)
export interface ResourceCreateRequestedEvent extends BaseEvent {
  type: 'resource.create.requested';
  data: Omit<Resource, 'id' | 'created_at' | 'times_helped'>;
}

export interface ResourceCreatedEvent extends BaseEvent {
  type: 'resource.created';
  data: Resource;
}

export interface ResourceCreateFailedEvent extends BaseEvent {
  type: 'resource.create.failed';
  data: {
    error: string;
  };
}

// Resource Update Events (existing)
export interface ResourceUpdateRequestedEvent extends BaseEvent {
  type: 'resource.update.requested';
  data: Partial<Resource> & { id: string };
}

export interface ResourceUpdatedEvent extends BaseEvent {
  type: 'resource.updated';
  data: Resource;
}

export interface ResourceUpdateFailedEvent extends BaseEvent {
  type: 'resource.update.failed';
  data: {
    error: string;
  };
}

// Resource Delete Events
export interface ResourceDeleteRequestedEvent extends BaseEvent {
  type: 'resource.delete.requested';
  data: {
    resourceId: string;
  };
}

export interface ResourceDeletedEvent extends BaseEvent {
  type: 'resource.deleted';
  data: {
    resourceId: string;
  };
}

export interface ResourceDeleteFailedEvent extends BaseEvent {
  type: 'resource.delete.failed';
  data: {
    resourceId: string;
    error: string;
  };
}

// Union type for all resource events
export type ResourceEvent =
  | ResourceFetchRequestedEvent
  | ResourceFetchSuccessEvent
  | ResourceFetchFailedEvent
  | ResourceCreateRequestedEvent
  | ResourceCreatedEvent
  | ResourceCreateFailedEvent
  | ResourceUpdateRequestedEvent
  | ResourceUpdatedEvent
  | ResourceUpdateFailedEvent
  | ResourceDeleteRequestedEvent
  | ResourceDeletedEvent
  | ResourceDeleteFailedEvent;