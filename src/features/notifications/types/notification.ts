export interface Notification {
  id: string;
  userId: string;
  type: 
    // Existing types (5)
    | 'comment' 
    | 'comment_reply' 
    | 'claim' 
    | 'message' 
    | 'new_resource'
    // Social Interactions (3)
    | 'shoutout_received'
    | 'connection_request'
    | 'connection_accepted'
    // My Resources (2)
    | 'resource_claim_cancelled'
    | 'resource_claim_completed'
    // My Registrations (4)
    | 'claim_approved'
    | 'claim_rejected'
    | 'claimed_resource_updated'
    | 'claimed_resource_cancelled'
    // My Communities (2)
    | 'community_member_joined'
    | 'community_member_left'
    // Community Activity (1)
    | 'new_event'
    // Trust & Recognition (2)
    | 'trust_points_received'
    | 'trust_level_changed';
  
  // Polymorphic references
  resourceId?: string;
  commentId?: string;
  claimId?: string;
  messageId?: string;
  conversationId?: string;
  communityId?: string;
  
  // Actor information
  actorId: string;
  actorName?: string;
  actorAvatarUrl?: string;
  
  // Grouping
  groupKey?: string;
  actorCount: number;
  
  // Content
  title: string;
  body?: string;
  imageUrl?: string;
  actionUrl?: string;
  metadata: Record<string, unknown>;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationInput {
  type: Notification['type'];
  resourceId?: string;
  commentId?: string;
  claimId?: string;
  messageId?: string;
  conversationId?: string;
  communityId?: string;
  actorId: string;
  groupKey?: string;
  title: string;
  body?: string;
  imageUrl?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// Type guards for notification categories
export const isCommentNotification = (type: Notification['type']): boolean => 
  ['comment', 'comment_reply'].includes(type);

export const isClaimNotification = (type: Notification['type']): boolean =>
  ['claim', 'resource_claim_cancelled', 'resource_claim_completed', 'claim_approved', 'claim_rejected', 'claimed_resource_updated', 'claimed_resource_cancelled'].includes(type);

export const isResourceNotification = (type: Notification['type']): boolean =>
  ['new_resource', 'new_event', 'community_member_joined', 'community_member_left'].includes(type);

export const isSocialNotification = (type: Notification['type']): boolean =>
  ['shoutout_received', 'connection_request', 'connection_accepted'].includes(type);

export const isTrustNotification = (type: Notification['type']): boolean =>
  ['trust_points_received', 'trust_level_changed'].includes(type);

export const isMessageNotification = (type: Notification['type']): boolean =>
  type === 'message';

// Notification permission groups
export enum NotificationGroup {
  SOCIAL_INTERACTIONS = 'social_interactions',
  MY_RESOURCES = 'my_resources', 
  MY_REGISTRATIONS = 'my_registrations',
  MY_COMMUNITIES = 'my_communities',
  COMMUNITY_ACTIVITY = 'community_activity',
  TRUST_RECOGNITION = 'trust_recognition',
  MESSAGES = 'messages'
}

export const getNotificationGroup = (type: Notification['type']): NotificationGroup => {
  switch (type) {
    case 'comment':
    case 'comment_reply':
    case 'shoutout_received':
    case 'connection_request':
    case 'connection_accepted':
      return NotificationGroup.SOCIAL_INTERACTIONS;
      
    case 'claim':
    case 'resource_claim_cancelled':
    case 'resource_claim_completed':
      return NotificationGroup.MY_RESOURCES;
      
    case 'claim_approved':
    case 'claim_rejected':
    case 'claimed_resource_updated':
    case 'claimed_resource_cancelled':
      return NotificationGroup.MY_REGISTRATIONS;
      
    case 'community_member_joined':
    case 'community_member_left':
      return NotificationGroup.MY_COMMUNITIES;
      
    case 'new_resource':
    case 'new_event':
      return NotificationGroup.COMMUNITY_ACTIVITY;
      
    case 'trust_points_received':
    case 'trust_level_changed':
      return NotificationGroup.TRUST_RECOGNITION;
      
    case 'message':
      return NotificationGroup.MESSAGES;
      
    default:
      return NotificationGroup.SOCIAL_INTERACTIONS;
  }
};