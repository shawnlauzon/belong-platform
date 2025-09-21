import type { QueryClient } from '@tanstack/react-query';
import type {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { notificationKeys } from '../queries';
import { toDomainNotification } from '../transformers/';
import type { NotificationDetail } from '../types/';
import { logger } from '@/shared';
import { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { ConversationRowWithParticipants } from '@/features/messages/types/messageRow';
import {
  conversationKeys,
  communityChatKeys,
} from '@/features/messages/queries';
import { commentKeys } from '@/features/comments/queries';
import { shoutoutKeys } from '@/features/shoutouts/queries';
import { resourceKeys, resourceClaimsKeys } from '@/features/resources/queries';
import {
  communityKeys,
  communityMembersKeys,
  userCommunitiesKeys,
} from '@/features/communities/queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';
import { NOTIFICATION_TYPES } from '../constants';

export interface CreateNotificationSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
}

interface RealtimeBroadcastMessage {
  event: string;
  payload: NotificationDetailsRow | ConversationRowWithParticipants;
  type: string;
}

/**
 * Creates a subscription for new notifications for a given user.
 */
export async function createNotificationSubscription({
  supabase,
  queryClient,
  userId,
}: CreateNotificationSubscriptionParams): Promise<RealtimeChannel> {
  logger.info('=== CREATING NOTIFICATION SUBSCRIPTION ===', {
    userId,
    channelName: `user:${userId}:notifications`,
  });

  await supabase.realtime.setAuth();
  const channel = supabase
    .channel(`user:${userId}:notifications`, {
      config: { private: true },
    })
    .on(
      'broadcast',
      { event: '*' },
      async (message: RealtimeBroadcastMessage) => {
        try {
          logger.debug('🔔 === BROADCAST MESSAGE RECEIVED ===', {
            message,
            userId,
          });

          // All notification events contain NotificationDetailsRow payload
          const notificationRow = message.payload as NotificationDetailsRow;

          // Handle cache invalidation based on notification type
          const notificationType = message.event;

          switch (notificationType) {
            case NOTIFICATION_TYPES.COMMENT:
            case NOTIFICATION_TYPES.COMMENT_REPLY:
              handleCommentNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.SHOUTOUT_RECEIVED:
              handleShoutoutNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.CLAIM:
            case NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED:
            case NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED:
            case NOTIFICATION_TYPES.CLAIM_APPROVED:
            case NOTIFICATION_TYPES.CLAIM_REJECTED:
              handleResourceClaimNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.NEW_RESOURCE:
            case NOTIFICATION_TYPES.NEW_EVENT:
            case NOTIFICATION_TYPES.CLAIMED_RESOURCE_UPDATED:
            case NOTIFICATION_TYPES.CLAIMED_RESOURCE_CANCELLED:
              handleResourceNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.COMMUNITY_MEMBER_JOINED:
            case NOTIFICATION_TYPES.COMMUNITY_MEMBER_LEFT:
              handleCommunityMembershipNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.TRUST_POINTS_GAINED:
            case NOTIFICATION_TYPES.TRUST_POINTS_LOST:
            case NOTIFICATION_TYPES.TRUST_LEVEL_CHANGED:
              handleTrustScoreNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.MESSAGE:
              handleMessageNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.CONVERSATION:
              handleConversationCreatedNotification(notificationRow);
              break;

            default:
              logger.warn('Unknown notification type for cache invalidation:', {
                type: notificationType,
                notificationId: notificationRow.id,
              });
          }

          // Handle as regular notification (update notification lists and unread count)
          handleNewNotification(notificationRow);
        } catch (error) {
          logger.error(
            'createNotificationSubscription: error processing notification',
            {
              error,
              message,
              userId,
            },
          );
        }
      },
    )
    .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
      logger.info('=== SUBSCRIPTION STATUS CHANGE ===', {
        status,
        userId,
      });
      if (err) {
        logger.error('=== SUBSCRIPTION ERROR ===', {
          error: err,
          userId,
        });
        throw err;
      }
    });

  return channel;

  function handleNewNotification(notificationRow: NotificationDetailsRow) {
    // Transform the notification data (no need to fetch since it's in the payload)
    const newNotification = toDomainNotification(notificationRow);

    // Update notifications list cache
    queryClient.setQueryData(
      notificationKeys.list(userId),
      (oldData: NotificationDetail[] | undefined) => {
        if (!oldData) return [newNotification];
        return [newNotification, ...oldData];
      },
    );

    // Increment unread count
    queryClient.setQueryData(
      notificationKeys.unreadCount(),
      (prev: number) => (prev || 0) + 1,
    );
  }

  function handleConversationCreatedNotification(
    _notificationRow: NotificationDetailsRow,
  ) {
    queryClient.invalidateQueries({
      queryKey: conversationKeys.conversations(),
    });
  }

  function handleCommentNotification(_notificationRow: NotificationDetailsRow) {
    // Invalidate comment lists to show new comments
    queryClient.invalidateQueries({
      queryKey: commentKeys.lists(),
    });
  }

  function handleShoutoutNotification(notificationRow: NotificationDetailsRow) {
    const { actor_id, user_id } = notificationRow;

    // Invalidate shoutout lists for both sender and receiver
    if (actor_id) {
      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.listBySender(actor_id),
      });
    }

    if (user_id) {
      queryClient.invalidateQueries({
        queryKey: shoutoutKeys.listByReceiver(user_id),
      });
    }
  }

  function handleResourceClaimNotification(
    notificationRow: NotificationDetailsRow,
  ) {
    const { resource_id, claim_id, user_id } = notificationRow;

    // Invalidate resource claims lists
    if (resource_id) {
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByResource(resource_id),
      });
    }

    if (claim_id) {
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.detail(claim_id),
      });
    }

    // Invalidate user's claims as claimant and resource owner
    if (user_id) {
      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByClaimant(user_id),
      });

      queryClient.invalidateQueries({
        queryKey: resourceClaimsKeys.listByResourceOwner(user_id),
      });
    }
  }

  function handleResourceNotification(notificationRow: NotificationDetailsRow) {
    const { resource_id, community_id } = notificationRow;

    // Invalidate resource lists
    queryClient.invalidateQueries({
      queryKey: resourceKeys.lists(),
    });

    if (resource_id) {
      queryClient.invalidateQueries({
        queryKey: resourceKeys.detail(resource_id),
      });
    }

    // Invalidate community resource lists if community_id is available
    if (community_id) {
      queryClient.invalidateQueries({
        queryKey: communityKeys.detail(community_id),
      });
    }
  }

  function handleCommunityMembershipNotification(
    notificationRow: NotificationDetailsRow,
  ) {
    const { community_id, actor_id, user_id } = notificationRow;

    if (community_id) {
      // Invalidate community member lists
      queryClient.invalidateQueries({
        queryKey: communityMembersKeys.list(community_id),
      });

      // Invalidate user communities for the actor (person joining/leaving)
      if (actor_id) {
        queryClient.invalidateQueries({
          queryKey: userCommunitiesKeys.list(actor_id),
        });
      }

      // Also invalidate for the notification recipient
      if (user_id) {
        queryClient.invalidateQueries({
          queryKey: userCommunitiesKeys.list(user_id),
        });
      }
    }
  }

  function handleTrustScoreNotification(
    notificationRow: NotificationDetailsRow,
  ) {
    const { user_id } = notificationRow;

    // Invalidate trust score data for the user
    if (user_id) {
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.listByUser(user_id),
      });

      // Invalidate trust score logs
      queryClient.invalidateQueries({
        queryKey: trustScoreKeys.logsByUser(user_id),
      });
    }
  }

  function handleMessageNotification(notificationRow: NotificationDetailsRow) {
    const { community_id } = notificationRow;

    // Invalidate conversation lists and total unread count
    queryClient.invalidateQueries({
      queryKey: conversationKeys.conversations(),
    });

    queryClient.invalidateQueries({
      queryKey: conversationKeys.totalUnreadCount(),
    });

    if (community_id) {
      // Invalidate community chat messages and unread counts
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.messages(community_id),
      });

      queryClient.invalidateQueries({
        queryKey: communityChatKeys.unreadCount(community_id),
      });

      queryClient.invalidateQueries({
        queryKey: communityChatKeys.totalUnreadCount(),
      });
    }
  }
}
