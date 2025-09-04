import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { getCurrentUserId } from '@/features/auth/api';
import type { Notification } from '../types/notification';
import { fetchNotifications, type FetchNotificationsFilter } from '../api/fetchNotifications';
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
  filter: FetchNotificationsFilter = {}
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

        logger.info('useNotifications: initializing notification subscription', {
          userId,
          filter: filterRef.current,
        });

        // Load initial notifications
        logger.debug('useNotifications: loading initial notifications', {
          userId,
          limit,
          filter: filterRef.current,
        });

        const initialData = await fetchNotifications(supabase, {
          ...filterRef.current,
          limit,
          offset: 0,
        });

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
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
          }, async (payload) => {
            logger.info('useNotifications: received new notification via realtime', {
              userId,
              notificationId: payload.new.id,
              type: payload.new.type,
            });

            // Check if notification matches current filter
            const matchesFilter = checkNotificationMatchesFilter(payload.new, filterRef.current);
            if (!matchesFilter) {
              logger.debug('useNotifications: notification does not match filter', {
                notificationId: payload.new.id,
                filter: filterRef.current,
              });
              return;
            }

            try {
              // Fetch full notification with joins
              const { data } = await supabase
                .from('notification_details')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const newNotification = notificationTransformer(data);

                logger.debug('useNotifications: adding new notification to state', {
                  notificationId: newNotification.id,
                  type: newNotification.type,
                  userId,
                });

                // Add new notification to the beginning of the list (most recent first)
                setNotifications(prev => [newNotification, ...prev]);

                // Invalidate React Query cache for counts
                queryClient.invalidateQueries({
                  queryKey: notificationKeys.counts(),
                });
              } else {
                logger.warn('useNotifications: failed to fetch new notification data', {
                  notificationId: payload.new.id,
                  userId,
                });
              }
            } catch (fetchError) {
              logger.error('useNotifications: error fetching new notification', {
                error: fetchError,
                notificationId: payload.new.id,
                userId,
              });
            }
          })
          .subscribe((status, err) => {
            if (err) {
              logger.error('useNotifications: realtime subscription error', {
                error: err,
                userId,
              });
            } else {
              logger.info('useNotifications: realtime subscription established', {
                status,
                userId,
                initialNotificationCount: initialData.length,
              });
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
        });
        supabase.removeChannel(channel);
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

      setNotifications(prev => [...prev, ...nextPageData]);
      setHasMore(nextPageData.length === limit);
      setCurrentPage(prev => prev + 1);
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
  filter: Omit<FetchNotificationsFilter, 'limit' | 'offset'>
): boolean {
  if (filter.type && notification.type !== filter.type) {
    return false;
  }
  
  if (typeof filter.isRead === 'boolean' && notification.is_read !== filter.isRead) {
    return false;
  }
  
  return true;
}