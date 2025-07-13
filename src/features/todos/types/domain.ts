export type TodoType = 
  | 'event_upcoming'      // RSVP'd events
  | 'resource_pending'    // Resources awaiting response
  | 'resource_accepted'   // Accepted resources (active commitments)
  | 'shoutout_pending'    // Shoutouts to be given
  | 'message_unread';     // Unread direct messages

export type UrgencyLevel = 'urgent' | 'soon' | 'normal';

export type TodoSection = 'attention' | 'in_progress' | 'upcoming' | 'history';

export interface TodoSummary {
  id: string;              // Composite ID: `${type}_${entityId}`
  type: TodoType;
  title: string;
  description: string;
  urgencyLevel: UrgencyLevel;
  dueDate?: Date;          // For events and time-sensitive items
  entityId: string;        // Original entity ID (event, resource, etc.)
  communityId: string;
  createdAt: Date;
  metadata: {
    // Type-specific data
    eventStartTime?: Date;
    eventEndTime?: Date;
    resourceOwnerId?: string;
    resourceOwnerName?: string;
    fromUserId?: string;
    fromUserName?: string;
    toUserId?: string;
    toUserName?: string;
    status?: string;
  };
}

export interface TodoFilter {
  userId: string;          // Required - always filter by current user
  section?: TodoSection;
  communityIds?: string[];
  limit?: number;
}

export interface TodoCounts {
  needsAttention: number;
  inProgress: number;
  upcoming: number;
  recent: number;
  unreadMessages: number;
}