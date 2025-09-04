import { useState, useEffect } from 'react';
import { useSupabase, logger } from '@/shared';
import type { Notification } from '../types/notification';
import { notificationTransformer } from '../transformers';
import { subscribeToNotifications } from '../api/subscribeToNotifications';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCurrentUser } from '@/features/auth';

interface UseNotificationsResult {
  data: Notification[];
  isLoading: boolean;
}

export function useNotifications(): UseNotificationsResult {
  const supabase = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  useEffect(() => {
    if (!supabase || !currentUser) {
      logger.debug('useNotifications: waiting for supabase client');
      return;
    }

    let channel: RealtimeChannel;
    let userId: string;

    const setupRealtimeNotifications = async () => {
      try {
        userId = currentUser.id;

        logger.info(
          'useNotifications: initializing notification subscription',
          {
            userId,
          },
        );

        // Load initial notifications
        logger.debug('useNotifications: loading initial notifications', {
          userId,
        });

        // const initialData = await fetchNotifications(client, userId, {
        //   limit: 1000,
        // });

        // logger.info('useNotifications: initial notifications loaded', {
        //   userId,
        //   notificationCount: initialData.notifications.length,
        //   hasMore: initialData.hasMore,
        // });

        // setNotifications(initialData.notifications);

        // Set up realtime subscription
        channel = subscribeToNotifications(supabase, userId, {
          onNotification: async (payload) => {
            try {
              logger.debug(
                'useNotifications: fetching full notification details',
                {
                  notificationId: payload.new.id,
                  userId,
                },
              );

              // Fetch full notification with joins
              const { data, error: fetchError } = await supabase
                .from('notification_details')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              logger.debug('useNotifications: notification fetch completed', {
                notificationId: payload.new.id,
                userId,
                hasData: !!data,
                hasError: !!fetchError,
                fetchError,
                dataKeys: data ? Object.keys(data) : null,
              });

              if (data) {
                const newNotification = notificationTransformer(data);

                logger.debug(
                  'useNotifications: adding new notification to state',
                  {
                    notificationId: newNotification.id,
                    type: newNotification.type,
                    userId,
                  },
                );

                // Add new notification to the beginning of the list (most recent first)
                setNotifications((prev) => [newNotification, ...prev]);
              } else {
                logger.warn(
                  'useNotifications: failed to fetch new notification data',
                  {
                    userId,
                  },
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
      if (channel) {
        logger.debug('useNotifications: cleaning up realtime subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
          channelState: channel.state,
        });
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, currentUser]);

  return {
    data: notifications,
    isLoading: isCurrentUserLoading,
  };
}
