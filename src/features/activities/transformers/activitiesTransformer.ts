import type { ActivityInfo, ActivityType, UrgencyLevel } from '../types';

/**
 * Transform event attendances to activity info
 */
export function transformEventsToActivities(eventAttendances: any[]): ActivityInfo[] {
  return eventAttendances.map(attendance => {
    const event = attendance.event;
    const startDateTime = new Date(event.start_date_time);
    const endDateTime = event.end_date_time ? new Date(event.end_date_time) : undefined;
    
    return {
      id: `event_upcoming_${event.id}`,
      type: 'event_upcoming' as ActivityType,
      title: event.title,
      description: `Event at ${event.location}`,
      urgencyLevel: calculateEventUrgency(startDateTime),
      dueDate: startDateTime,
      entityId: event.id,
      communityId: event.community_id,
      createdAt: new Date(attendance.created_at),
      metadata: {
        eventStartTime: startDateTime,
        eventEndTime: endDateTime,
        status: attendance.status
      }
    };
  });
}

/**
 * Transform resource responses to activity info
 */
export function transformResourcesToActivities(resourceResponses: any[]): ActivityInfo[] {
  return resourceResponses.map(response => {
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
      urgencyLevel: calculateResourceUrgency(new Date(response.created_at), isPending),
      entityId: resource.id,
      communityId: resource.community_id,
      createdAt: new Date(response.created_at),
      metadata: {
        resourceOwnerId: resource.owner_id,
        resourceOwnerName: getUserDisplayName(resource.owner),
        status: response.status
      }
    };
  });
}

/**
 * Transform pending shoutout opportunities to activity info
 */
export function transformShoutoutsToActivities(pendingShoutouts: any[]): ActivityInfo[] {
  return pendingShoutouts.map(response => {
    const resource = response.resource;
    
    return {
      id: `shoutout_pending_${resource.id}`,
      type: 'shoutout_pending' as ActivityType,
      title: `Give shoutout for: ${resource.title}`,
      description: `Thank ${getUserDisplayName(resource.owner)} for their help`,
      urgencyLevel: calculateShoutoutUrgency(new Date(response.updated_at)),
      entityId: resource.id,
      communityId: resource.community_id,
      createdAt: new Date(response.updated_at),
      metadata: {
        resourceOwnerId: resource.owner_id,
        resourceOwnerName: getUserDisplayName(resource.owner),
        toUserId: resource.owner_id,
        toUserName: getUserDisplayName(resource.owner)
      }
    };
  });
}

/**
 * Transform unread messages to activity info
 */
export function transformMessagesToActivities(messages: any[]): ActivityInfo[] {
  return messages.map(message => {
    return {
      id: `message_unread_${message.id}`,
      type: 'message_unread' as ActivityType,
      title: `Message from ${getUserDisplayName(message.from_user)}`,
      description: message.content.substring(0, 100) + (message.content.length > 100 ? '...' : ''),
      urgencyLevel: calculateMessageUrgency(new Date(message.created_at)),
      entityId: message.id,
      communityId: '', // Messages don't have community context
      createdAt: new Date(message.created_at),
      metadata: {
        fromUserId: message.from_user_id,
        fromUserName: getUserDisplayName(message.from_user)
      }
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
function calculateResourceUrgency(responseDate: Date, isPending: boolean): UrgencyLevel {
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
function getUserDisplayName(user: any): string {
  if (!user) return 'Unknown User';
  
  const metadata = user.user_metadata || {};
  return metadata.full_name || metadata.name || user.email || 'Unknown User';
}