import { useState, useEffect } from 'react';
import { useSupabase, logger } from '@/shared';
import { getCurrentUserId } from '@/features/auth/api';
import { fetchNotificationCount } from '../api/fetchNotificationCount';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseNotificationCountResult {
  data: number | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useNotificationCount(): UseNotificationCountResult {
  const supabase = useSupabase();
  const [count, setCount] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!supabase) {
      logger.debug('useNotificationCount: waiting for supabase client');
      return;
    }

    let channel: RealtimeChannel;
    let userId: string | null;
    let pollInterval: NodeJS.Timeout;

    const setupCount = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user ID
        userId = await getCurrentUserId(supabase);
        if (!userId) {
          logger.warn('useNotificationCount: no authenticated user');
          setIsLoading(false);
          return;
        }

        logger.info('useNotificationCount: initializing count subscription', {
          userId,
        });

        // Load initial count
        const initialCount = await fetchNotificationCount(supabase);
        setCount(initialCount.total);
        setIsLoading(false);

        // Set up realtime subscription for count changes
        channel = supabase
          .channel(`user:${userId}:notification-count`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_state',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            logger.debug('useNotificationCount: received count update via realtime', {
              userId,
              newCount: payload.new.unread_notification_count,
            });
            setCount(payload.new.unread_notification_count || 0);
          })
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, async () => {
            // On new notification, refetch count to ensure accuracy
            try {
              const refreshedCount = await fetchNotificationCount(supabase);
              setCount(refreshedCount.total);
            } catch (fetchError) {
              logger.error('useNotificationCount: error refreshing count', {
                error: fetchError,
                userId,
              });
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, async () => {
            // On notification update (e.g., marked as read), refetch count
            try {
              const refreshedCount = await fetchNotificationCount(supabase);
              setCount(refreshedCount.total);
            } catch (fetchError) {
              logger.error('useNotificationCount: error refreshing count', {
                error: fetchError,
                userId,
              });
            }
          })
          .subscribe((status, err) => {
            if (err) {
              logger.error('useNotificationCount: realtime subscription error', {
                error: err,
                userId,
              });
              setError(err);
            } else {
              logger.info('useNotificationCount: realtime subscription established', {
                status,
                userId,
              });
            }
          });

        // Set up polling as backup (every 30 seconds)
        pollInterval = setInterval(async () => {
          try {
            const polledCount = await fetchNotificationCount(supabase);
            setCount(polledCount.total);
          } catch (pollError) {
            logger.error('useNotificationCount: error during polling', {
              error: pollError,
              userId,
            });
          }
        }, 30000);

      } catch (setupError) {
        logger.error('useNotificationCount: failed to setup count', {
          error: setupError,
          userId,
        });
        setError(setupError as Error);
        setIsLoading(false);
      }
    };

    setupCount();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [supabase]);

  return {
    data: count,
    isLoading,
    isError: !!error,
    error,
  };
}