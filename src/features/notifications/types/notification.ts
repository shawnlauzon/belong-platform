export interface Notification {
  id: string;
  userId: string;
  type: 'comment' | 'comment_reply' | 'claim' | 'message' | 'new_resource';
  
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
  metadata: Record<string, any>;
  
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
  metadata?: Record<string, any>;
}