import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { getCurrentUserId } from '@/features/auth/api';
import type { Notification } from '../types/notification';
import {
  fetchNotifications,
  type FetchNotificationsFilter,
} from '../api/fetchNotifications';
import { notificationTransformer } from '../transformers';
import { notificationKeys } from '../queries';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseNotificationsResult {
  data: Notification[];
  isLoading: boolean;
  hasMore: boolean;
  fetchNextPage: () => Promise<void>;
  isFetchingNextPage: boolean;
  error: Error | null;
}

export function useNotifications(
  filter: FetchNotificationsFilter = {},
): UseNotificationsResult {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const { limit = 20, ...restFilter } = filter;

  // Use ref to track filter changes and prevent unnecessary re-renders
  const filterRef = useRef(restFilter);
  const filterStringRef = useRef(JSON.stringify(restFilter));

  // Only update filter if it actually changed
  const currentFilterString = JSON.stringify(restFilter);
  if (currentFilterString !== filterStringRef.current) {
    filterRef.current = restFilter;
    filterStringRef.current = currentFilterString;
  }

  useEffect(() => {
    logger.debug('useNotifications: useEffect triggered', {
      hasSupabase: !!supabase,
      currentFilterString,
      limit,
    });

    if (!supabase) {
      logger.debug('useNotifications: waiting for supabase client');
      return;
    }

    let channel: RealtimeChannel;
    let userId: string | null;

    const setupNotifications = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user ID
        userId = await getCurrentUserId(supabase);
        if (!userId) {
          logger.warn('useNotifications: no authenticated user');
          setIsLoading(false);
          return;
        }

        logger.info(
          'useNotifications: initializing notification subscription',
          {
            userId,
            filter: filterRef.current,
          },
        );

        // Load initial notifications
        logger.debug('useNotifications: loading initial notifications', {
          userId,
          limit,
          filter: filterRef.current,
        });

        let initialData;
        try {
          initialData = await fetchNotifications(supabase, {
            ...filterRef.current,
            limit,
            offset: 0,
          });

          logger.debug('useNotifications: initial fetch successful', {
            userId,
            dataCount: initialData.length,
            limit,
          });
        } catch (fetchError) {
          logger.error('useNotifications: initial fetch failed', {
            error: fetchError,
            userId,
            filter: filterRef.current,
          });
          throw fetchError;
        }

        logger.info('useNotifications: initial notifications loaded', {
          userId,
          notificationCount: initialData.length,
          hasMore: initialData.length === limit,
        });

        setNotifications(initialData);
        setHasMore(initialData.length === limit);
        setCurrentPage(1);
        setIsLoading(false);

        // Set up realtime subscription
        logger.debug('useNotifications: setting up realtime subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
        });

        channel = supabase
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

              // Check if notification matches current filter
              logger.debug('useNotifications: checking notification filter', {
                notificationId: payload.new?.id,
                userId,
                payloadNew: payload.new,
                currentFilter: filterRef.current,
              });

              const matchesFilter = checkNotificationMatchesFilter(
                payload.new,
                filterRef.current,
              );

              logger.debug('useNotifications: filter check result', {
                notificationId: payload.new?.id,
                userId,
                matchesFilter,
                filterType: filterRef.current.type,
                notificationType: payload.new?.type,
                filterIsRead: filterRef.current.isRead,
                notificationIsRead: payload.new?.is_read,
              });

              if (!matchesFilter) {
                logger.debug(
                  'useNotifications: notification does not match filter, skipping',
                  {
                    notificationId: payload.new?.id,
                    filter: filterRef.current,
                  },
                );
                return;
              }

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

                  // Invalidate React Query cache for counts
                  queryClient.invalidateQueries({
                    queryKey: notificationKeys.counts(),
                  });
                } else {
                  logger.warn(
                    'useNotifications: failed to fetch new notification data',
                    {
                      notificationId: payload.new.id,
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
                  initialNotificationCount: initialData.length,
                },
              );
            }
          });
      } catch (setupError) {
        logger.error('useNotifications: failed to setup notifications', {
          error: setupError,
          userId,
        });
        setError(setupError as Error);
        setIsLoading(false);
      }
    };

    setupNotifications();

    return () => {
      if (channel) {
        logger.debug('useNotifications: cleaning up realtime subscription', {
          userId,
          channelName: `user:${userId}:notifications`,
          channelState: channel.state,
        });
        try {
          const removeResult = supabase.removeChannel(channel);
          logger.debug('useNotifications: channel removal result', {
            userId,
            channelName: `user:${userId}:notifications`,
            removeResult,
          });
        } catch (cleanupError) {
          logger.error('useNotifications: error during channel cleanup', {
            error: cleanupError,
            userId,
            channelName: `user:${userId}:notifications`,
          });
        }
      } else {
        logger.debug('useNotifications: no channel to cleanup', { userId });
      }
    };
  }, [supabase, queryClient, currentFilterString, limit]);

  const fetchNextPage = async (): Promise<void> => {
    if (!hasMore || isFetchingNextPage || isLoading) {
      return;
    }

    setIsFetchingNextPage(true);
    try {
      const nextPageData = await fetchNotifications(supabase, {
        ...filterRef.current,
        limit,
        offset: currentPage * limit,
      });

      logger.debug('useNotifications: fetched next page', {
        page: currentPage,
        newNotifications: nextPageData.length,
        hasMore: nextPageData.length === limit,
      });

      setNotifications((prev) => [...prev, ...nextPageData]);
      setHasMore(nextPageData.length === limit);
      setCurrentPage((prev) => prev + 1);
    } catch (fetchError) {
      logger.error('useNotifications: error fetching next page', {
        error: fetchError,
        page: currentPage,
      });
      setError(fetchError as Error);
    } finally {
      setIsFetchingNextPage(false);
    }
  };

  return {
    data: notifications,
    isLoading,
    hasMore,
    fetchNextPage,
    isFetchingNextPage,
    error,
  };
}

// Helper function to check if a notification matches the current filter
function checkNotificationMatchesFilter(
  notification: Record<string, unknown>,
  filter: Omit<FetchNotificationsFilter, 'limit' | 'offset'>,
): boolean {
  if (filter.type && notification.type !== filter.type) {
    return false;
  }

  if (
    typeof filter.isRead === 'boolean' &&
    notification.is_read !== filter.isRead
  ) {
    return false;
  }

  return true;
}
