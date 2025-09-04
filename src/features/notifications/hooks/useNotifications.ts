import { useState, useEffect } from 'react';
import { useSupabase, logger } from '@/shared';
import type { Notification } from '../types/notification';
import { fetchNotifications } from '../api/fetchNotifications';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCurrentUser } from '@/features/auth';

interface UseNotificationsResult {
  data: Notification[];
  isLoading: boolean;
}

export function useNotifications(): UseNotificationsResult {
  const client = useSupabase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  useEffect(() => {
    if (!client || !currentUser) {
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

        const initialData = await fetchNotifications(client, userId, {
          limit: 1000,
        });

        logger.info('useNotifications: initial notifications loaded', {
          userId,
          notificationCount: initialData.notifications.length,
          hasMore: initialData.hasMore,
        });

        setNotifications(initialData.notifications);

        logger.debug('useNotifications: setting up realtime subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
        });

        // Set up realtime subscription for future notifications
        channel = client
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
              logger.info(
                'useNotifications: received new notification via realtime',
                {
                  userId,
                  notificationId: payload.new?.id,
                  type: payload.new?.type,
                  payloadStructure: {
                    hasNew: !!payload.new,
                    hasOld: !!payload.old,
                    eventType: payload.eventType,
                    schema: payload.schema,
                    table: payload.table,
                    commit_timestamp: payload.commit_timestamp,
                    errors: payload.errors,
                  },
                  fullPayload: payload,
                },
              );

              // Fetch full notification with joins
              const { data, error: fetchError } = await client
                .from('notifications')
                .select('id, type, user_id, created_at, updated_at')
                .eq('id', payload.new.id)
                .single();

              if (fetchError) {
                logger.error(
                  'useNotifications: error fetching new notification',
                  {
                    error: fetchError,
                    notificationId: payload.new.id,
                    userId,
                  },
                );
                return;
              }

              if (data) {
                // const newNotification = transformNotification(data);
                const newNotification = {
                  id: '2',
                  userId,
                  type: 'new_event',
                  metadata: {},
                  isRead: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                } as Notification;

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
                    notificationId: payload.new.id,
                    userId,
                  },
                );
              }
            },
          )
          .subscribe((status, err) => {
            logger.info(
              'useNotifications: realtime subscription callback triggered',
              {
                status,
                hasError: !!err,
                userId,
                channelName: `user:${userId}:notifications`,
              },
            );

            if (err) {
              logger.error('useNotifications: realtime subscription error', {
                error: err,
                errorMessage: err?.message,
                errorName: err?.name,
                errorStack: err?.stack,
                errorDetails: JSON.stringify(err),
                userId,
                channelName: `user:${userId}:notifications`,
                subscriberStatus: status,
              });
            } else {
              logger.info(
                'useNotifications: realtime subscription established',
                {
                  status,
                  userId,
                  channelName: `user:${userId}:notifications`,
                  initialNotificationCount: initialData.notifications.length,
                },
              );
            }
          });
        logger.info(
          'useMessages: realtime subscription established successfully',
          {
            userId,
          },
        );
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
        client.removeChannel(channel);
      }
    };
  }, [client, currentUser]);

  return {
    data: notifications,
    isLoading: isCurrentUserLoading,
  };
}
