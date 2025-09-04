import type { Database } from '@/shared/types/database';

type NotificationDetailsRow = Database['public']['Views']['notification_details']['Row'];

export interface NotificationContent {
  title: string;
  body: string;
  actionUrl: string;
  imageUrl?: string;
}

export function generateNotificationContent(
  notification: NotificationDetailsRow
): NotificationContent {
  const baseContent: NotificationContent = {
    title: '',
    body: '',
    actionUrl: '',
    imageUrl: notification.actor_avatar || undefined,
  };

  const notificationType = notification.type || 'new_resource';
  
  switch (notificationType) {
    // Comment notifications
    case 'comment':
      return {
        ...baseContent,
        title: `${notification.actor_name || 'Someone'} commented on your ${notification.resource_type || 'resource'}`,
        body: notification.comment_content?.substring(0, 100) + '...' || '',
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'comment_reply':
      return {
        ...baseContent,
        title: `${notification.actor_name || 'Someone'} replied to your comment`,
        body: notification.comment_content?.substring(0, 100) + '...' || '',
        actionUrl: `/resources/${notification.resource_id}`,
      };

    // Resource & Claim notifications
    case 'new_resource':
      return {
        ...baseContent,
        title: notification.community_name 
          ? `New ${notification.resource_type || 'resource'} in ${notification.community_name}`
          : `New ${notification.resource_type || 'resource'}`,
        body: notification.resource_title || '',
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'new_event':
      return {
        ...baseContent,
        title: notification.community_name 
          ? `New event in ${notification.community_name}`
          : 'New event',
        body: notification.resource_title || '',
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'claim':
      return {
        ...baseContent,
        title: `${notification.actor_name || 'Someone'} claimed your ${notification.resource_type || 'resource'}`,
        body: `"${notification.resource_title}"`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'claim_approved':
      return {
        ...baseContent,
        title: 'Your claim was approved',
        body: `Your claim for "${notification.resource_title}" has been approved`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'claim_rejected':
      return {
        ...baseContent,
        title: 'Your claim was rejected',
        body: `Your claim for "${notification.resource_title}" was not approved`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'resource_claim_completed':
      return {
        ...baseContent,
        title: 'Claim marked as completed',
        body: `${notification.actor_name || 'Someone'} marked their claim on "${notification.resource_title}" as completed`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'resource_claim_cancelled':
      return {
        ...baseContent,
        title: 'Claim cancelled',
        body: `${notification.actor_name || 'Someone'} cancelled their claim on "${notification.resource_title}"`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'claimed_resource_updated':
      return {
        ...baseContent,
        title: 'Resource you claimed was updated',
        body: `"${notification.resource_title}" has been updated`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    case 'claimed_resource_cancelled':
      return {
        ...baseContent,
        title: 'Resource cancelled',
        body: `"${notification.resource_title}" has been cancelled`,
        actionUrl: `/resources/${notification.resource_id}`,
      };

    // Community notifications
    case 'community_member_joined':
      return {
        ...baseContent,
        title: 'New member in your community',
        body: `${notification.actor_name || 'Someone'} joined ${notification.community_name}`,
        actionUrl: `/communities/${notification.community_id}`,
      };

    case 'community_member_left':
      return {
        ...baseContent,
        title: 'Member left your community',
        body: `${notification.actor_name || 'Someone'} left ${notification.community_name}`,
        actionUrl: `/communities/${notification.community_id}`,
      };

    // Social notifications
    case 'shoutout_received':
      return {
        ...baseContent,
        title: `${notification.actor_name || 'Someone'} gave you a shoutout`,
        body: notification.shoutout_message?.substring(0, 100) + '...' || '',
        actionUrl: `/profile/${notification.actor_id}`,
      };

    case 'connection_request':
      return {
        ...baseContent,
        title: 'New connection request',
        body: `${notification.actor_name || 'Someone'} wants to connect with you`,
        actionUrl: `/connections`,
      };

    case 'connection_accepted':
      return {
        ...baseContent,
        title: 'Connection accepted',
        body: `${notification.actor_name || 'Someone'} accepted your connection request`,
        actionUrl: `/profile/${notification.actor_id}`,
      };

    // Trust notifications
    case 'trust_points_received':
      return {
        ...baseContent,
        title: 'You earned trust points',
        body: notification.trust_score 
          ? `You now have ${notification.trust_score} points in ${notification.community_name}`
          : `You earned trust points in ${notification.community_name}`,
        actionUrl: `/communities/${notification.community_id}`,
      };

    case 'trust_level_changed':
      return {
        ...baseContent,
        title: 'Trust level changed',
        body: `Your trust level changed in ${notification.community_name}`,
        actionUrl: `/communities/${notification.community_id}`,
      };

    // Message notifications (legacy support)
    case 'message':
      return {
        ...baseContent,
        title: 'New message',
        body: `You have a new message from ${notification.actor_name || 'someone'}`,
        actionUrl: `/messages`,
      };

    // Default fallback
    default:
      return {
        ...baseContent,
        title: notificationType.replace(/_/g, ' '),
        body: 'You have a new notification',
        actionUrl: '/',
      };
  }
}

export function generateNotificationImageUrl(
  notification: NotificationDetailsRow
): string | undefined {
  // Use actor avatar for most notifications
  if (notification.actor_avatar) {
    return notification.actor_avatar;
  }

  // Could add resource images or other sources here if needed
  return undefined;
}