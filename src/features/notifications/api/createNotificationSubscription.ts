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
import { Conversation } from '@/features/messages';
import { NotificationDetailsRow } from '../types/notificationDetailsRow';
import { ConversationRowWithParticipants } from '@/features/messages/types/messageRow';
import { conversationKeys } from '@/features/messages/queries';
import { toDomainConversation } from '@/features/messages/transformers';

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

          switch (message.event) {
            case 'new_notification':
              handleNewNotification(message.payload as NotificationDetailsRow);
              break;
            case 'new_conversation':
              handleNewConversation(
                message.payload as ConversationRowWithParticipants,
              );
              break;
            default:
              break;
          }
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

  function handleNewConversation(
    conversationRow: ConversationRowWithParticipants,
  ) {
    // Transform the notification data (no need to fetch since it's in the payload)
    const newConversation = toDomainConversation(conversationRow);

    // Update notifications list cache
    queryClient.setQueryData(
      conversationKeys.list(newConversation.conversationType),
      (oldData: Conversation[] | undefined) => {
        if (!oldData) return [newConversation];
        return [newConversation, ...oldData];
      },
    );
  }
}
