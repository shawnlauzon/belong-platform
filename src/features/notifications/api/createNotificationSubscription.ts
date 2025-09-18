import type { QueryClient } from '@tanstack/react-query';
import type {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { notificationKeys } from '../queries';
import { transformNotification } from '../transformers/notificationTransformer';
import type { NotificationDetail } from '../types/notificationDetail';
import { logger } from '@/shared';

export interface CreateNotificationSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
}

interface RealtimeBroadcastMessage {
  event: string;
  payload: {
    id: string;
    old_record:
      | Database['public']['Views']['notification_details']['Row']
      | null;
    operation: string;
    record: Database['public']['Views']['notification_details']['Row'];
    schema: string;
    table: string;
  };
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

          const notificationData = message.payload.record;
          if (!notificationData?.id) {
            logger.warn(
              'createNotificationSubscription: received payload without notification data',
              {
                message,
                notificationData,
                userId,
              },
            );
            return;
          }

          // Transform the notification data (no need to fetch since it's in the payload)
          const newNotification = transformNotification(notificationData);

          // Update notifications list cache
          queryClient.setQueryData(
            notificationKeys.list(userId),
            (oldData: NotificationDetail[] | undefined) => {
              if (!oldData) return [newNotification];
              return [newNotification, ...oldData];
            },
          );

          // Increment unread count
          if (message.event === 'new_notification') {
            queryClient.setQueryData(
              notificationKeys.unreadCount(),
              (prev: number) => (prev || 0) + 1,
            );
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
      console.log('=== SUBSCRIPTION STATUS CHANGE ===');
      console.log('Status:', status);
      console.log('Channel:', `user:${userId}:notifications`);
      if (err) {
        console.log('Error:', err);
      }
      console.log('==================================');
      if (err) {
        throw err;
      }
    });

  return channel;
}
