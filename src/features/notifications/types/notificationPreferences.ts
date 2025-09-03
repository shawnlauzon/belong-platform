import type { Database } from '@/shared/types/database';

export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row'];
export type NotificationPreferencesInsert = Database['public']['Tables']['notification_preferences']['Insert'];
export type NotificationPreferencesUpdate = Database['public']['Tables']['notification_preferences']['Update'];

// Grouped preference interfaces
export interface SocialInteractionsPreferences {
  comments_on_resources: boolean;
  comment_replies: boolean;
  shoutout_received: boolean;
  connection_request: boolean;
  connection_accepted: boolean;
}

export interface MyResourcesPreferences {
  resource_claims: boolean;
  resource_claim_cancelled: boolean;
  resource_claim_completed: boolean;
}

export interface MyRegistrationsPreferences {
  claim_approved: boolean;
  claim_rejected: boolean;
  claimed_resource_updated: boolean;
  claimed_resource_cancelled: boolean;
}

export interface MyCommunitiesPreferences {
  community_member_joined: boolean;
  community_member_left: boolean;
}

export interface CommunityActivityPreferences {
  community_resources: boolean;
  new_event: boolean;
}

export interface TrustRecognitionPreferences {
  trust_points_received: boolean;
  trust_level_changed: boolean;
}

export interface MessagesPreferences {
  direct_messages: boolean;
  community_messages: boolean;
}

export interface GroupedNotificationPreferences {
  socialInteractions: SocialInteractionsPreferences;
  myResources: MyResourcesPreferences;
  myRegistrations: MyRegistrationsPreferences;
  myCommunities: MyCommunitiesPreferences;
  communityActivity: CommunityActivityPreferences;
  trustRecognition: TrustRecognitionPreferences;
  messages: MessagesPreferences;
}

// Helper function to convert flat preferences to grouped
export const groupPreferences = (preferences: NotificationPreferences): GroupedNotificationPreferences => ({
  socialInteractions: {
    comments_on_resources: preferences.comments_on_resources ?? true,
    comment_replies: preferences.comment_replies ?? true,
    shoutout_received: preferences.shoutout_received ?? true,
    connection_request: preferences.connection_request ?? true,
    connection_accepted: preferences.connection_accepted ?? true,
  },
  myResources: {
    resource_claims: preferences.resource_claims ?? true,
    resource_claim_cancelled: preferences.resource_claim_cancelled ?? true,
    resource_claim_completed: preferences.resource_claim_completed ?? true,
  },
  myRegistrations: {
    claim_approved: preferences.claim_approved ?? true,
    claim_rejected: preferences.claim_rejected ?? true,
    claimed_resource_updated: preferences.claimed_resource_updated ?? true,
    claimed_resource_cancelled: preferences.claimed_resource_cancelled ?? true,
  },
  myCommunities: {
    community_member_joined: preferences.community_member_joined ?? true,
    community_member_left: preferences.community_member_left ?? true,
  },
  communityActivity: {
    community_resources: preferences.community_resources ?? true,
    new_event: preferences.new_event ?? true,
  },
  trustRecognition: {
    trust_points_received: preferences.trust_points_received ?? true,
    trust_level_changed: preferences.trust_level_changed ?? true,
  },
  messages: {
    direct_messages: preferences.direct_messages ?? true,
    community_messages: preferences.community_messages ?? true,
  },
});

// Helper function to flatten grouped preferences back to database format
export const flattenPreferences = (grouped: Partial<GroupedNotificationPreferences>): Partial<NotificationPreferencesUpdate> => {
  const flattened: Partial<NotificationPreferencesUpdate> = {};
  
  if (grouped.socialInteractions) {
    flattened.comments_on_resources = grouped.socialInteractions.comments_on_resources;
    flattened.comment_replies = grouped.socialInteractions.comment_replies;
    flattened.shoutout_received = grouped.socialInteractions.shoutout_received;
    flattened.connection_request = grouped.socialInteractions.connection_request;
    flattened.connection_accepted = grouped.socialInteractions.connection_accepted;
  }
  
  if (grouped.myResources) {
    flattened.resource_claims = grouped.myResources.resource_claims;
    flattened.resource_claim_cancelled = grouped.myResources.resource_claim_cancelled;
    flattened.resource_claim_completed = grouped.myResources.resource_claim_completed;
  }
  
  if (grouped.myRegistrations) {
    flattened.claim_approved = grouped.myRegistrations.claim_approved;
    flattened.claim_rejected = grouped.myRegistrations.claim_rejected;
    flattened.claimed_resource_updated = grouped.myRegistrations.claimed_resource_updated;
    flattened.claimed_resource_cancelled = grouped.myRegistrations.claimed_resource_cancelled;
  }
  
  if (grouped.myCommunities) {
    flattened.community_member_joined = grouped.myCommunities.community_member_joined;
    flattened.community_member_left = grouped.myCommunities.community_member_left;
  }
  
  if (grouped.communityActivity) {
    flattened.community_resources = grouped.communityActivity.community_resources;
    flattened.new_event = grouped.communityActivity.new_event;
  }
  
  if (grouped.trustRecognition) {
    flattened.trust_points_received = grouped.trustRecognition.trust_points_received;
    flattened.trust_level_changed = grouped.trustRecognition.trust_level_changed;
  }
  
  if (grouped.messages) {
    flattened.direct_messages = grouped.messages.direct_messages;
    flattened.community_messages = grouped.messages.community_messages;
  }
  
  return flattened;
};