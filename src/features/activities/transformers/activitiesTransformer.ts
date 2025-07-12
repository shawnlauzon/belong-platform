import type { ActivitySummary, ActivityType, UrgencyLevel } from '../types';
import type { Database } from '@/shared/types/database';

// Database row types for convenience
type Json = Database['public']['Tables']['profiles']['Row']['user_metadata'];

// Partial profile data as returned by API
interface PartialProfile {
  id: string;
  email: string;
  user_metadata: Json;
}

// Simplified types that match actual API response shapes
interface EventAttendanceWithEvent {
  created_at: string;
  gathering_id: string;
  status: string;
  updated_at: string;
  user_id: string;
  event: {
    id: string;
    title: string;
    description: string;
    start_date_time: string;
    end_date_time: string | null;
    location_name: string;
    community_id: string;
    [key: string]: unknown; // Allow additional properties
  };
}

interface ResourceResponseWithResource {
  created_at: string | null;
  resource_id: string;
  status: string;
  updated_at: string | null;
  user_id: string;
  resource: {
    id: string;
    title: string;
    description: string;
    community_id: string;
    owner_id: string;
    owner: PartialProfile;
    [key: string]: unknown; // Allow additional properties
  };
}

interface MessageWithUser {
  id: string;
  content: string;
  created_at: string;
  from_user_id: string;
  from_user: PartialProfile;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Transform event attendances to activity info
 */
export function transformEventsToActivities(
  eventAttendances: EventAttendanceWithEvent[],
): ActivitySummary[] {
  return eventAttendances.map((attendance) => {
    const event = attendance.event;
    const startDateTime = new Date(event.start_date_time);
    const endDateTime = event.end_date_time
      ? new Date(event.end_date_time)
      : undefined;

    return {
      id: `event_upcoming_${event.id}`,
      type: 'event_upcoming' as ActivityType,
      title: event.title,
      description: `Event at ${event.location_name}`,
      urgencyLevel: calculateEventUrgency(startDateTime),
      dueDate: startDateTime,
      entityId: event.id,
      communityId: event.community_id,
      createdAt: new Date(attendance.created_at),
      metadata: {
        eventStartTime: startDateTime,
        eventEndTime: endDateTime,
        status: attendance.status,
      },
    };
  });
}

/**
 * Transform resource responses to activity info
 */
export function transformResourcesToActivities(
  resourceResponses: ResourceResponseWithResource[],
): ActivitySummary[] {
  return resourceResponses.map((response) => {
    const resource = response.resource;
    const isPending = response.status === 'pending';

    const type = isPending ? 'resource_pending' : 'resource_accepted';
    const title = isPending
      ? `Response needed: ${resource.title}`
      : `Helping with: ${resource.title}`;

    return {
      id: `${type}_${resource.id}`,
      type: type as ActivityType,
      title,
      description: resource.description,
      urgencyLevel: calculateResourceUrgency(
        new Date(response.created_at || response.updated_at || Date.now()),
        isPending,
      ),
      entityId: resource.id,
      communityId: resource.community_id,
      createdAt: new Date(
        response.created_at || response.updated_at || Date.now(),
      ),
      metadata: {
        resourceOwnerId: resource.owner_id,
        resourceOwnerName: getUserDisplayName(resource.owner),
        status: response.status,
      },
    };
  });
}

/**
 * Transform pending shoutout opportunities to activity info
 */
export function transformShoutoutsToActivities(
  pendingShoutouts: ResourceResponseWithResource[],
): ActivitySummary[] {
  return pendingShoutouts.map((response) => {
    const resource = response.resource;

    return {
      id: `shoutout_pending_${resource.id}`,
      type: 'shoutout_pending' as ActivityType,
      title: `Give shoutout for: ${resource.title}`,
      description: `Thank ${getUserDisplayName(resource.owner)} for their help`,
      urgencyLevel: calculateShoutoutUrgency(
        new Date(response.updated_at || response.created_at || Date.now()),
      ),
      entityId: resource.id,
      communityId: resource.community_id,
      createdAt: new Date(
        response.updated_at || response.created_at || Date.now(),
      ),
      metadata: {
        resourceOwnerId: resource.owner_id,
        resourceOwnerName: getUserDisplayName(resource.owner),
        toUserId: resource.owner_id,
        toUserName: getUserDisplayName(resource.owner),
      },
    };
  });
}

/**
 * Transform unread messages to activity info
 */
export function transformMessagesToActivities(
  messages: MessageWithUser[],
): ActivitySummary[] {
  return messages.map((message) => {
    return {
      id: `message_unread_${message.id}`,
      type: 'message_unread' as ActivityType,
      title: `Message from ${getUserDisplayName(message.from_user)}`,
      description:
        message.content.substring(0, 100) +
        (message.content.length > 100 ? '...' : ''),
      urgencyLevel: calculateMessageUrgency(new Date(message.created_at)),
      entityId: message.id,
      communityId: '', // Messages don't have community context
      createdAt: new Date(message.created_at),
      metadata: {
        fromUserId: message.from_user_id,
        fromUserName: getUserDisplayName(message.from_user),
      },
    };
  });
}

/**
 * Calculate urgency level for events based on start time
 */
function calculateEventUrgency(startDateTime: Date): UrgencyLevel {
  const now = new Date();
  const timeDiff = startDateTime.getTime() - now.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff <= 24) return 'urgent';
  if (hoursDiff <= 72) return 'soon';
  return 'normal';
}

/**
 * Calculate urgency level for resources based on response time
 */
function calculateResourceUrgency(
  responseDate: Date,
  isPending: boolean,
): UrgencyLevel {
  if (!isPending) return 'normal';

  const now = new Date();
  const timeDiff = now.getTime() - responseDate.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff >= 7) return 'urgent';
  if (daysDiff >= 3) return 'soon';
  return 'normal';
}

/**
 * Calculate urgency level for shoutouts based on completion time
 */
function calculateShoutoutUrgency(completionDate: Date): UrgencyLevel {
  const now = new Date();
  const timeDiff = now.getTime() - completionDate.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

  if (daysDiff >= 3) return 'urgent';
  if (daysDiff >= 1) return 'soon';
  return 'normal';
}

/**
 * Calculate urgency level for messages based on received time
 */
function calculateMessageUrgency(receivedDate: Date): UrgencyLevel {
  const now = new Date();
  const timeDiff = now.getTime() - receivedDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  if (hoursDiff >= 48) return 'urgent';
  if (hoursDiff >= 12) return 'soon';
  return 'normal';
}

/**
 * Get display name from user profile data
 */
function getUserDisplayName(user: PartialProfile): string {
  if (!user) return 'Unknown User';

  const metadata = user.user_metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const metadataObj = metadata as Record<string, unknown>;
    const fullName = metadataObj.full_name;
    const name = metadataObj.name;

    if (typeof fullName === 'string') return fullName;
    if (typeof name === 'string') return name;
  }

  return user.email || 'Unknown User';
}
