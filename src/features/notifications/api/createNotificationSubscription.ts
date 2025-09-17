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
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        try {
          if (!payload.new.id) {
            logger.warn(
              'createNotificationSubscription: received payload without ID',
              {
                payload,
                userId,
              },
            );
            return;
          }

          logger.debug(
            'createNotificationSubscription: fetching full notification details',
            {
              notificationId: payload.new.id,
              userId,
            },
          );

          // Fetch full notification details
          const { data } = await supabase
            .from('notification_details')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const newNotification = transformNotification(data);

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

            // Increment unread count for conversation
            queryClient.setQueryData(
              notificationKeys.unreadCount(),
              (prev: number) => (prev || 0) + 1,
            );
          } else {
            logger.warn(
              'createNotificationSubscription: failed to fetch notification data',
              {
                notificationId: payload.new.id,
                userId,
              },
            );
          }
        } catch (error) {
          logger.error(
            'createNotificationSubscription: error processing notification',
            {
              error,
              notificationId: payload.new.id,
              userId,
            },
          );
        }
      },
    )
    .subscribe();

  return channel;
}
