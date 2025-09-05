import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import type { NotificationDetail } from '../types/notificationDetail';
import { transformNotification } from '../transformers/notificationTransformer';
import { subscribeToNotifications } from '../api/subscribeToNotifications';
import type { NotificationSubscription } from '../api/subscribeToNotifications';
import { fetchNotifications } from '../api/fetchNotifications';
import { useCurrentUser } from '@/features/auth';
import { notificationKeys } from '../queries';

interface UseNotificationsResult {
  data: NotificationDetail[];
  isLoading: boolean;
}

export function useNotifications(): UseNotificationsResult {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  // Use React Query to fetch and cache notifications
  const query = useQuery({
    queryKey: notificationKeys.list({ limit: 1000 }),
    queryFn: async () => {
      if (!supabase || !currentUser) {
        throw new Error('Supabase client or user not available');
      }
      
      logger.debug('useNotifications: loading notifications via React Query', {
        userId: currentUser.id,
      });
      
      const data = await fetchNotifications(supabase, { limit: 1000 });
      
      logger.info('useNotifications: notifications loaded via React Query', {
        userId: currentUser.id,
        notificationCount: data.notifications.length,
        hasMore: data.hasMore,
      });
      
      return data.notifications;
    },
    enabled: !!supabase && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes - real-time updates handle freshness
  });

  // Set up real-time subscription to update React Query cache
  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    let subscription: NotificationSubscription;
    const userId = currentUser.id;

    const setupRealtimeNotifications = async () => {
      try {
        logger.info(
          'useNotifications: initializing notification subscription',
          { userId },
        );

        subscription = await subscribeToNotifications(supabase, userId, {
          onNotification: async (payload) => {
            try {
              if (!payload.new.id) {
                logger.warn('useNotifications: received payload without ID', {
                  payload,
                  userId,
                });
                return;
              }

              logger.debug(
                'useNotifications: fetching full notification details',
                {
                  notificationId: payload.new.id,
                  userId,
                },
              );

              const { data } = await supabase
                .from('notification_details')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const newNotification = transformNotification(data);

                logger.debug(
                  'useNotifications: adding new notification to React Query cache',
                  {
                    notificationId: newNotification.id,
                    type: newNotification.type,
                    userId,
                  },
                );

                // Update React Query cache with new notification
                queryClient.setQueryData(
                  notificationKeys.list({ limit: 1000 }),
                  (oldData: NotificationDetail[] | undefined) => {
                    if (!oldData) return [newNotification];
                    return [newNotification, ...oldData];
                  },
                );
              } else {
                logger.warn(
                  'useNotifications: failed to fetch new notification data',
                  { userId },
                );
              }
            } catch (fetchError) {
              logger.error(
                'useNotifications: error fetching new notification',
                {
                  error: fetchError,
                  notificationId: payload.new.id,
                  userId,
                },
              );
            }
          },
        });
      } catch (setupError) {
        logger.error('useNotifications: failed to setup notifications', {
          error: setupError,
          userId,
        });
      }
    };

    setupRealtimeNotifications();

    return () => {
      if (subscription) {
        logger.debug('useNotifications: cleaning up realtime subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
        });
        subscription.cleanup();
      }
    };
  }, [supabase, currentUser, queryClient]);

  return {
    data: query.data || [],
    isLoading: query.isLoading,
  };
}
