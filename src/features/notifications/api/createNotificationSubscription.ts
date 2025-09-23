import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { notificationKeys } from '../queries';
import { toDomainNotification } from '../transformers/';
import type { NotificationDetail } from '../types/';
import { logger, subscribeToChannel } from '@/shared';
import { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { ConversationRowWithParticipants } from '@/features/messages/types/messageRow';
import type { Conversation } from '@/features/messages/types';
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
import { getAuthUserId } from '@/features/auth/api';
import { fetchConversation } from '@/features/messages/api';
import { notificationChannelForUser } from '@/features/messages/utils';

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
export async function createNotificationSubscription(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
): Promise<RealtimeChannel> {
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const channelName = notificationChannelForUser(userId);

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
          logger.debug(
            '🔔 === BROADCAST MESSAGE RECEIVED ===',
            channelName,
            message,
          );

          // All notification events contain NotificationDetailsRow payload
          const notificationRow = message.payload as NotificationDetailsRow;

          // Handle cache invalidation based on notification type
          const notificationType = message.event;

          switch (notificationType) {
            case NOTIFICATION_TYPES.COMMENT_CREATED:
            case NOTIFICATION_TYPES.COMMENT_REPLY:
              handleCommentNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.SHOUTOUT_CREATED:
              handleShoutoutNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.CLAIM_CREATED:
            case NOTIFICATION_TYPES.RESOURCE_CLAIM_CANCELLED:
            case NOTIFICATION_TYPES.RESOURCE_CLAIM_COMPLETED:
            case NOTIFICATION_TYPES.CLAIM_APPROVED:
            case NOTIFICATION_TYPES.CLAIM_REJECTED:
              handleResourceClaimNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.RESOURCE_CREATED:
            case NOTIFICATION_TYPES.EVENT_CREATED:
            case NOTIFICATION_TYPES.RESOURCE_UPDATED:
            case NOTIFICATION_TYPES.RESOURCE_CANCELLED:
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

            case NOTIFICATION_TYPES.MESSAGE_CREATED:
              handleMessageNotification(notificationRow);
              break;

            case NOTIFICATION_TYPES.CONVERSATION_CREATED:
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
    );

  // Add retry logic and return the channel
  return subscribeToChannel(channel);

  function handleNewNotification(notificationRow: NotificationDetailsRow) {
    // Transform the notification data (no need to fetch since it's in the payload)
    const newNotification = toDomainNotification(notificationRow);

    // Update notifications list cache
    queryClient.setQueryData(
      notificationKeys.list(),
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
    notificationRow: NotificationDetailsRow,
  ) {
    const conversationId = notificationRow.conversation_id;

    if (conversationId) {
      fetchConversation(supabase, conversationId)
        .then((conversation) => {
          // Add the new conversation to the cache
          queryClient.setQueryData<Conversation[]>(
            conversationKeys.list(),
            (oldConversations: Conversation[] | undefined) => {
              if (!oldConversations) return [conversation];

              // Check if conversation already exists to avoid duplicates
              const existingIndex = oldConversations.findIndex(
                (c) => c.id === conversation.id,
              );
              if (existingIndex === -1) {
                // Add new conversation at the beginning (most recent first)
                return [conversation, ...oldConversations];
              }
              return oldConversations;
            },
          );

          logger.debug('Added new conversation to cache', {
            conversationId: conversation.id,
          });
        })
        .catch((error) => {
          logger.error('Failed to fetch new conversation for cache', {
            error,
            conversationId,
          });

          // Fall back to invalidation if fetch fails
          queryClient.invalidateQueries({
            queryKey: conversationKeys.list(),
          });
        });
    } else {
      // No conversation ID in metadata, fall back to invalidation
      logger.debug(
        'No conversation ID found in notification metadata, falling back to invalidation',
      );
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(),
      });
    }
  }

  function handleCommentNotification(_notificationRow: NotificationDetailsRow) {
    // Invalidate comment lists to show new comments
    queryClient.invalidateQueries({
      queryKey: commentKeys.lists(),
    });
  }

  function handleShoutoutNotification(
    _notificationRow: NotificationDetailsRow,
  ) {
    // Invalidate shoutout lists for both sender and receiver
    // Invalidate all shoutouts cache when shoutout notification received
    queryClient.invalidateQueries({
      queryKey: shoutoutKeys.all,
    });
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
    const { conversation_id: conversationId, community_id: communityId } =
      notificationRow;

    if (conversationId) {
      // Invalidate conversation messages and unread counts
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(conversationId),
      });

      queryClient.invalidateQueries({
        queryKey: conversationKeys.unreadCount(conversationId),
      });

      queryClient.invalidateQueries({
        queryKey: conversationKeys.totalUnreadCount(),
      });
    } else if (communityId) {
      // Invalidate community chat messages and unread counts
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.messages(communityId),
      });

      queryClient.invalidateQueries({
        queryKey: communityChatKeys.unreadCount(communityId),
      });

      queryClient.invalidateQueries({
        queryKey: communityChatKeys.totalUnreadCount(),
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.all,
      });
    }
  }
}
