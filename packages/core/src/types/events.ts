import { Resource, Community, ProfileMetadata, Thanks } from './entities';
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

export interface AuthSignOutRequestedEvent extends BaseEvent {
  type: 'auth.signOut.requested';
  data: void;
}

export interface AuthSignOutSuccessEvent extends BaseEvent {
  type: 'auth.signOut.success';
  data: {
    userId?: string;
    sessionId?: string;
    timestamp: number;
  };
}

export interface AuthSignOutFailedEvent extends BaseEvent {
  type: 'auth.signOut.failed';
  data: {
    error: string;
    errorCode?: string;
    userId?: string;
    retryable: boolean;
    details?: {
      sessionExpired?: boolean;
      networkError?: boolean;
      serverError?: boolean;
    };
  };
}

// Community Events
export interface CommunityFetchRequestedEvent extends BaseEvent {
  type: 'community.fetch.requested';
  data: {
    filters?: {
      level?: Community['level'];
      parent_id?: string;
      searchTerm?: string;
      country?: string;
      state?: string;
      city?: string;
    };
  };
}

export interface CommunityFetchSuccessEvent extends BaseEvent {
  type: 'community.fetch.success';
  data: {
    communities: Community[];
  };
}

export interface CommunityFetchFailedEvent extends BaseEvent {
  type: 'community.fetch.failed';
  data: {
    error: string;
  };
}

export interface CommunityCreateRequestedEvent extends BaseEvent {
  type: 'community.create.requested';
  data: {
    name: string;
    level: Community['level'];
    description: string;
    country: string;
    state?: string;
    city: string;
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

export interface CommunityUpdateRequestedEvent extends BaseEvent {
  type: 'community.update.requested';
  data: Partial<Community> & { id: string };
}

export interface CommunityUpdatedEvent extends BaseEvent {
  type: 'community.updated';
  data: Community;
}

export interface CommunityUpdateFailedEvent extends BaseEvent {
  type: 'community.update.failed';
  data: {
    error: string;
  };
}

export interface CommunityDeleteRequestedEvent extends BaseEvent {
  type: 'community.delete.requested';
  data: {
    communityId: string;
  };
}

export interface CommunityDeletedEvent extends BaseEvent {
  type: 'community.deleted';
  data: {
    communityId: string;
  };
}

export interface CommunityDeleteFailedEvent extends BaseEvent {
  type: 'community.delete.failed';
  data: {
    communityId: string;
    error: string;
  };
}

export interface CommunityActiveChangeRequestedEvent extends BaseEvent {
  type: 'community.active.change.requested';
  data: {
    communityId: string;
  };
}

export interface CommunityActiveChangedEvent extends BaseEvent {
  type: 'community.active.changed';
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
export interface ResourceFetchRequestedEvent extends BaseEvent {
  type: 'resource.fetch.requested';
  data: {
    filters?: import('./entities').ResourceFilter;
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

// Thanks Events
export interface ThanksFetchRequestedEvent extends BaseEvent {
  type: 'thanks.fetch.requested';
  data: {
    filters?: {
      to_user_id?: string;
      from_user_id?: string;
      resource_id?: string;
      limit?: number;
      offset?: number;
    };
  };
}

export interface ThanksFetchSuccessEvent extends BaseEvent {
  type: 'thanks.fetch.success';
  data: {
    thanks: Thanks[];
  };
}

export interface ThanksFetchFailedEvent extends BaseEvent {
  type: 'thanks.fetch.failed';
  data: {
    error: string;
  };
}

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
  data: Thanks;
}

export interface ThanksCreateFailedEvent extends BaseEvent {
  type: 'thanks.create.failed';
  data: {
    error: string;
  };
}

export interface ThanksUpdateRequestedEvent extends BaseEvent {
  type: 'thanks.update.requested';
  data: Partial<Thanks> & { id: string };
}

export interface ThanksUpdatedEvent extends BaseEvent {
  type: 'thanks.updated';
  data: Thanks;
}

export interface ThanksUpdateFailedEvent extends BaseEvent {
  type: 'thanks.update.failed';
  data: {
    error: string;
  };
}

export interface ThanksDeleteRequestedEvent extends BaseEvent {
  type: 'thanks.delete.requested';
  data: {
    thanksId: string;
  };
}

export interface ThanksDeletedEvent extends BaseEvent {
  type: 'thanks.deleted';
  data: {
    thanksId: string;
  };
}

export interface ThanksDeleteFailedEvent extends BaseEvent {
  type: 'thanks.delete.failed';
  data: {
    thanksId: string;
    error: string;
  };
}

export interface TrustUpdatedEvent extends BaseEvent {
  type: 'trust.updated';
  data: {
    memberId: string;
    newScore: number;
  };
}

// Notification Events
export interface NotificationShowEvent extends BaseEvent {
  type: 'notification.show';
  data: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    action?: {
      label: string;
      callback: () => void;
    };
  };
}

// Navigation Events
export interface NavigationRedirectEvent extends BaseEvent {
  type: 'navigation.redirect';
  data: {
    path: string;
    replace?: boolean;
    state?: any;
  };
}

// Type guard functions for event type checking
export function isAuthSignInSuccessEvent(
  event: AppEvent
): event is AuthSignInSuccessEvent {
  return event.type === 'auth.signIn.success';
}

export function isAuthSignInFailedEvent(
  event: AppEvent
): event is AuthSignInFailedEvent {
  return event.type === 'auth.signIn.failed';
}

export function isAuthSignUpSuccessEvent(
  event: AppEvent
): event is AuthSignUpSuccessEvent {
  return event.type === 'auth.signUp.success';
}

export function isAuthSignUpFailedEvent(
  event: AppEvent
): event is AuthSignUpFailedEvent {
  return event.type === 'auth.signUp.failed';
}

export function isAuthSignOutSuccessEvent(
  event: AppEvent
): event is AuthSignOutSuccessEvent {
  return event.type === 'auth.signOut.success';
}

export function isAuthSignOutFailedEvent(
  event: AppEvent
): event is AuthSignOutFailedEvent {
  return event.type === 'auth.signOut.failed';
}

// Community event type guards
export function isCommunityFetchRequestedEvent(
  event: AppEvent
): event is CommunityFetchRequestedEvent {
  return event.type === 'community.fetch.requested';
}

export function isCommunityFetchSuccessEvent(
  event: AppEvent
): event is CommunityFetchSuccessEvent {
  return event.type === 'community.fetch.success';
}

export function isCommunityFetchFailedEvent(
  event: AppEvent
): event is CommunityFetchFailedEvent {
  return event.type === 'community.fetch.failed';
}

export function isCommunityCreatedEvent(
  event: AppEvent
): event is CommunityCreatedEvent {
  return event.type === 'community.created';
}

export function isCommunityCreateFailedEvent(
  event: AppEvent
): event is CommunityCreateFailedEvent {
  return event.type === 'community.create.failed';
}

export function isCommunityUpdatedEvent(
  event: AppEvent
): event is CommunityUpdatedEvent {
  return event.type === 'community.updated';
}

export function isCommunityUpdateFailedEvent(
  event: AppEvent
): event is CommunityUpdateFailedEvent {
  return event.type === 'community.update.failed';
}

export function isCommunityDeletedEvent(
  event: AppEvent
): event is CommunityDeletedEvent {
  return event.type === 'community.deleted';
}

export function isCommunityDeleteFailedEvent(
  event: AppEvent
): event is CommunityDeleteFailedEvent {
  return event.type === 'community.delete.failed';
}

export function isCommunityActiveChangeRequestedEvent(
  event: AppEvent
): event is CommunityActiveChangeRequestedEvent {
  return event.type === 'community.active.change.requested';
}

// Resource event type guards
export function isResourceFetchRequestedEvent(
  event: AppEvent
): event is ResourceFetchRequestedEvent {
  return event.type === 'resource.fetch.requested';
}

export function isResourceFetchSuccessEvent(
  event: AppEvent
): event is ResourceFetchSuccessEvent {
  return event.type === 'resource.fetch.success';
}

export function isResourceFetchFailedEvent(
  event: AppEvent
): event is ResourceFetchFailedEvent {
  return event.type === 'resource.fetch.failed';
}

export function isResourceCreatedEvent(
  event: AppEvent
): event is ResourceCreatedEvent {
  return event.type === 'resource.created';
}

export function isResourceCreateFailedEvent(
  event: AppEvent
): event is ResourceCreateFailedEvent {
  return event.type === 'resource.create.failed';
}

export function isResourceUpdatedEvent(
  event: AppEvent
): event is ResourceUpdatedEvent {
  return event.type === 'resource.updated';
}

export function isResourceUpdateFailedEvent(
  event: AppEvent
): event is ResourceUpdateFailedEvent {
  return event.type === 'resource.update.failed';
}

export function isResourceDeletedEvent(
  event: AppEvent
): event is ResourceDeletedEvent {
  return event.type === 'resource.deleted';
}

export function isResourceDeleteFailedEvent(
  event: AppEvent
): event is ResourceDeleteFailedEvent {
  return event.type === 'resource.delete.failed';
}

// Thanks event type guards
export function isThanksFetchRequestedEvent(
  event: AppEvent
): event is ThanksFetchRequestedEvent {
  return event.type === 'thanks.fetch.requested';
}

export function isThanksFetchSuccessEvent(
  event: AppEvent
): event is ThanksFetchSuccessEvent {
  return event.type === 'thanks.fetch.success';
}

export function isThanksFetchFailedEvent(
  event: AppEvent
): event is ThanksFetchFailedEvent {
  return event.type === 'thanks.fetch.failed';
}

export function isThanksCreatedEvent(
  event: AppEvent
): event is ThanksCreatedEvent {
  return event.type === 'thanks.created';
}

export function isThanksCreateFailedEvent(
  event: AppEvent
): event is ThanksCreateFailedEvent {
  return event.type === 'thanks.create.failed';
}

export function isThanksUpdatedEvent(
  event: AppEvent
): event is ThanksUpdatedEvent {
  return event.type === 'thanks.updated';
}

export function isThanksUpdateFailedEvent(
  event: AppEvent
): event is ThanksUpdateFailedEvent {
  return event.type === 'thanks.update.failed';
}

export function isThanksDeletedEvent(
  event: AppEvent
): event is ThanksDeletedEvent {
  return event.type === 'thanks.deleted';
}

export function isThanksDeleteFailedEvent(
  event: AppEvent
): event is ThanksDeleteFailedEvent {
  return event.type === 'thanks.delete.failed';
}

export type AppEvent =
  | AuthSignInRequestedEvent
  | AuthSignUpRequestedEvent
  | AuthSignOutRequestedEvent
  | AuthSignInSuccessEvent
  | AuthSignUpSuccessEvent
  | AuthSignInFailedEvent
  | AuthSignUpFailedEvent
  | AuthSignOutSuccessEvent
  | AuthSignOutFailedEvent
  | CommunityFetchRequestedEvent
  | CommunityFetchSuccessEvent
  | CommunityFetchFailedEvent
  | CommunityCreateRequestedEvent
  | CommunityCreatedEvent
  | CommunityCreateFailedEvent
  | CommunityUpdateRequestedEvent
  | CommunityUpdatedEvent
  | CommunityUpdateFailedEvent
  | CommunityDeleteRequestedEvent
  | CommunityDeletedEvent
  | CommunityDeleteFailedEvent
  | CommunityActiveChangeRequestedEvent
  | CommunityActiveChangedEvent
  | ProfileUpdateRequestedEvent
  | ProfileUpdatedEvent
  | ProfileUpdateFailedEvent
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
  | ResourceDeleteFailedEvent
  | ThanksFetchRequestedEvent
  | ThanksFetchSuccessEvent
  | ThanksFetchFailedEvent
  | ThanksCreateRequestedEvent
  | ThanksCreatedEvent
  | ThanksCreateFailedEvent
  | ThanksUpdateRequestedEvent
  | ThanksUpdatedEvent
  | ThanksUpdateFailedEvent
  | ThanksDeleteRequestedEvent
  | ThanksDeletedEvent
  | ThanksDeleteFailedEvent
  | TrustUpdatedEvent
  | NotificationShowEvent
  | NavigationRedirectEvent;