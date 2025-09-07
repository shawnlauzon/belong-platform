import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { notificationKeys } from '../queries';
import { transformNotification } from '../transformers/notificationTransformer';
import type { NotificationDetail } from '../types/notificationDetail';
import { subscribeToNotifications, type NotificationSubscription } from './subscribeToNotifications';

export interface CreateNotificationSubscriptionDependencies {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
  logger: typeof import('@/shared').logger;
}

export interface NotificationSubscriptionResult {
  subscription: NotificationSubscription;
  cleanup: () => Promise<void>;
}

/**
 * Creates a real-time notification subscription for a user.
 * This function extracts the core subscription logic from NotificationRealtimeProvider
 * to make it testable without React context.
 * 
 * @param dependencies - The required dependencies for creating the subscription
 * @returns Promise that resolves to subscription result with cleanup function
 */
export async function createNotificationSubscription(
  dependencies: CreateNotificationSubscriptionDependencies
): Promise<NotificationSubscriptionResult> {
  const { supabase, queryClient, userId, logger } = dependencies;

  logger.info('createNotificationSubscription: initializing subscription', { userId });

  const subscription = await subscribeToNotifications(supabase, userId, {
    onNotification: async (payload) => {
      try {
        if (!payload.new.id) {
          logger.warn('createNotificationSubscription: received payload without ID', {
            payload,
            userId,
          });
          return;
        }

        logger.debug('createNotificationSubscription: fetching full notification details', {
          notificationId: payload.new.id,
          userId,
        });

        // Fetch full notification details
        const { data } = await supabase
          .from('notification_details')
          .select('*')
          .eq('id', payload.new.id)
          .single();

        if (data) {
          const newNotification = transformNotification(data);

          logger.debug('createNotificationSubscription: updating React Query cache', {
            notificationId: newNotification.id,
            type: newNotification.type,
            userId,
          });

          // Update notifications list cache
          queryClient.setQueryData(
            notificationKeys.list({ limit: 1000 }),
            (oldData: NotificationDetail[] | undefined) => {
              if (!oldData) return [newNotification];
              return [newNotification, ...oldData];
            }
          );

          // Invalidate counts to trigger refetch
          queryClient.invalidateQueries({
            queryKey: ['unreadCounts'],
          });
        } else {
          logger.warn('createNotificationSubscription: failed to fetch notification data', {
            notificationId: payload.new.id,
            userId,
          });
        }
      } catch (error) {
        logger.error('createNotificationSubscription: error processing notification', {
          error,
          notificationId: payload.new.id,
          userId,
        });
      }
    },
  });

  logger.info('createNotificationSubscription: subscription established', { userId });

  const cleanup = async () => {
    logger.debug('createNotificationSubscription: cleaning up subscription', {
      userId,
      channelName: `user:${userId}:notifications`,
    });
    await subscription.cleanup();
  };

  return {
    subscription,
    cleanup,
  };
}