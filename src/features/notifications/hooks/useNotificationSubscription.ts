import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getCurrentUserId } from '@/features/auth/api';
import { notificationKeys } from '../queries';
import type { Notification } from '../types/notification';
import type { NotificationCounts } from '../types/notificationCounts';

export interface UseNotificationSubscriptionOptions {
  onNewNotification?: (notification: Notification) => void;
  onCountChange?: (counts: NotificationCounts) => void;
  onNotificationRead?: (notificationId: string) => void;
}

export function useNotificationSubscription(
  options: UseNotificationSubscriptionOptions = {}
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { onNewNotification, onCountChange, onNotificationRead } = options;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const setupSubscription = async () => {
      try {
        const userId = await getCurrentUserId(supabase);
        if (!userId) return;

        channel = supabase.channel(`user:${userId}:notifications`, {
          config: { private: true }
        });

        // Subscribe to new notifications
        channel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            // Invalidate notification lists
            queryClient.invalidateQueries({
              queryKey: notificationKeys.lists(),
            });
            
            // Invalidate counts
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });

            if (onNewNotification && payload.new) {
              // Transform the payload to notification format if needed
              // For now, just trigger refetch
              queryClient.invalidateQueries({
                queryKey: notificationKeys.lists(),
              });
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            // Handle read status updates
            queryClient.invalidateQueries({
              queryKey: notificationKeys.lists(),
            });
            
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });

            if (onNotificationRead && payload.new?.is_read && payload.new.id) {
              onNotificationRead(payload.new.id);
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notification_counts',
            filter: `user_id=eq.${userId}`,
          }, () => {
            // Update counts when notification_counts table changes
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });
          })
          .subscribe();

      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, queryClient, onNewNotification, onCountChange, onNotificationRead]);
}