import { useEffect, PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { notificationKeys } from '../queries';
import { transformNotification } from '../transformers/notificationTransformer';
import type { NotificationDetail } from '../types/notificationDetail';
import type { NotificationSubscription } from '../api/subscribeToNotifications';
import { subscribeToNotifications } from '../api/subscribeToNotifications';

/**
 * Provider that manages real-time notification subscriptions.
 * Updates React Query cache when new notifications arrive.
 * 
 * This should be placed near the root of your app to ensure
 * notifications are received globally.
 */
export function NotificationRealtimeProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    let subscription: NotificationSubscription;
    const userId = currentUser.id;

    const setupRealtimeNotifications = async () => {
      try {
        logger.info('NotificationRealtimeProvider: initializing subscription', { userId });

        subscription = await subscribeToNotifications(supabase, userId, {
          onNotification: async (payload) => {
            try {
              if (!payload.new.id) {
                logger.warn('NotificationRealtimeProvider: received payload without ID', {
                  payload,
                  userId,
                });
                return;
              }

              logger.debug('NotificationRealtimeProvider: fetching full notification details', {
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

                logger.debug('NotificationRealtimeProvider: updating React Query cache', {
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
                logger.warn('NotificationRealtimeProvider: failed to fetch notification data', {
                  notificationId: payload.new.id,
                  userId,
                });
              }
            } catch (error) {
              logger.error('NotificationRealtimeProvider: error processing notification', {
                error,
                notificationId: payload.new.id,
                userId,
              });
            }
          },
        });

        logger.info('NotificationRealtimeProvider: subscription established', { userId });
      } catch (error) {
        logger.error('NotificationRealtimeProvider: failed to setup notifications', {
          error,
          userId,
        });
      }
    };

    setupRealtimeNotifications();

    return () => {
      if (subscription) {
        logger.debug('NotificationRealtimeProvider: cleaning up subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
        });
        subscription.cleanup();
      }
    };
  }, [supabase, currentUser, queryClient]);

  return <>{children}</>;
}