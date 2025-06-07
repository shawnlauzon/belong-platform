import { Resource, Community, Member, ProfileMetadata } from './index';
import { User } from '@supabase/supabase-js';

export interface BaseEvent {
  id: string;
  timestamp: number;
  userId?: string;
  communityId?: string;
  source: 'user' | 'system' | 'api';
}

// Auth Events
export interface AuthSignInRequestedEvent extends BaseEvent {
  type: 'auth.signIn.requested';
  data: {
    email: string;
    password: string;
  };
}

export interface AuthSignUpRequestedEvent extends BaseEvent {
  type: 'auth.signUp.requested';
  data: {
    email: string;
    password: string;
    metadata?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface AuthSignInSuccessEvent extends BaseEvent {
  type: 'auth.signIn.success';
  data: {
    user: User | null;
  };
}

export interface AuthSignUpSuccessEvent extends BaseEvent {
  type: 'auth.signUp.success';
  data: {
    user: User | null;
  };
}

export interface AuthSignInFailedEvent extends BaseEvent {
  type: 'auth.signIn.failed';
  data: {
    error: string;
  };
}

export interface AuthSignUpFailedEvent extends BaseEvent {
  type: 'auth.signUp.failed';
  data: {
    error: string;
  };
}

// Community Events
export interface CommunityCreateRequestedEvent extends BaseEvent {
  type: 'community.create.requested';
  data: {
    name: string;
    level: Community['level'];
    description: string;
    country: string;
    state: string;
    city?: string;
    center?: { lat: number; lng: number };
    radius_km?: number;
  };
}

export interface CommunityCreatedEvent extends BaseEvent {
  type: 'community.created';
  data: Community;
}

export interface CommunityCreateFailedEvent extends BaseEvent {
  type: 'community.create.failed';
  data: {
    error: string;
  };
}

export interface CommunityChangedEvent extends BaseEvent {
  type: 'community.changed';
  data: {
    communityId: string;
  };
}

// Profile Events
export interface ProfileUpdateRequestedEvent extends BaseEvent {
  type: 'profile.update.requested';
  data: {
    userId: string;
    metadata: ProfileMetadata;
  };
}

export interface ProfileUpdatedEvent extends BaseEvent {
  type: 'profile.updated';
  data: {
    userId: string;
    updatedProfile: ProfileMetadata;
  };
}

export interface ProfileUpdateFailedEvent extends BaseEvent {
  type: 'profile.update.failed';
  data: {
    userId: string;
    error: string;
  };
}

// Resource Events
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

// Thanks Events
export interface ThanksCreateRequestedEvent extends BaseEvent {
  type: 'thanks.create.requested';
  data: {
    to_user_id: string;
    resource_id: string;
    message: string;
    image_urls?: string[];
    impact_description?: string;
  };
}

export interface ThanksCreatedEvent extends BaseEvent {
  type: 'thanks.created';
  data: {
    id: string;
    to_member_id: string;
    from_member_id: string;
    resource_id: string;
    message: string;
    image_urls: string[];
    impact_description?: string;
    created_at: string;
  };
}

export interface ThanksCreateFailedEvent extends BaseEvent {
  type: 'thanks.create.failed';
  data: {
    error: string;
  };
}

export type AppEvent =
  | AuthSignInRequestedEvent
  | AuthSignUpRequestedEvent
  | AuthSignInSuccessEvent
  | AuthSignUpSuccessEvent
  | AuthSignInFailedEvent
  | AuthSignUpFailedEvent
  | CommunityCreateRequestedEvent
  | CommunityCreatedEvent
  | CommunityCreateFailedEvent
  | CommunityChangedEvent
  | ProfileUpdateRequestedEvent
  | ProfileUpdatedEvent
  | ProfileUpdateFailedEvent
  | ResourceCreateRequestedEvent
  | ResourceCreatedEvent
  | ResourceCreateFailedEvent
  | ResourceUpdateRequestedEvent
  | ResourceUpdatedEvent
  | ResourceUpdateFailedEvent
  | ThanksCreateRequestedEvent
  | ThanksCreatedEvent
  | ThanksCreateFailedEvent;