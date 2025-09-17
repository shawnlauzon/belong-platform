import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
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

/**
 * Creates a subscription for new notifications for a given user.
 */
export async function createNotificationSubscription({
  supabase,
  queryClient,
  userId,
}: CreateNotificationSubscriptionParams): Promise<RealtimeChannel> {
  const channel = supabase
    .channel(`user:${userId}:notifications`, { config: { private: true } })
    .on(
      'broadcast',
      { event: 'new_notification' },
      async (payload) => {
        try {
          const notificationData = payload.payload?.record;

          if (!notificationData?.id) {
            logger.warn(
              'createNotificationSubscription: received payload without notification data',
              {
                payload,
                userId,
              },
            );
            return;
          }

          logger.debug(
            'createNotificationSubscription: received broadcast notification',
            {
              notificationId: notificationData.id,
              userId,
            },
          );

          // Transform the notification data (no need to fetch since it's in the payload)
          const newNotification = transformNotification(notificationData);

          logger.debug(
            'createNotificationSubscription: updating React Query cache',
            newNotification,
          );

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
        } catch (error) {
          logger.error(
            'createNotificationSubscription: error processing notification',
            {
              error,
              payload,
              userId,
            },
          );
        }
      },
    )
    .subscribe();

  return channel;
}
