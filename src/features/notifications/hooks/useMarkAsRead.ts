import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { markAsRead } from '../api/markAsRead';
import { notificationKeys } from '../queries';
import type { NotificationDetail } from '../types/notificationDetail';

export function useMarkAsRead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string | 'all') =>
      markAsRead(supabase, notificationId),
    onSuccess: (_data, notificationId) => {
      const now = new Date();

      // Check if notification was unread BEFORE updating cache
      const oldNotifications = queryClient.getQueryData<NotificationDetail[]>(
        notificationKeys.list(),
      );
      const wasUnread =
        notificationId === 'all'
          ? oldNotifications?.some((n) => !n.readAt) ?? false
          : oldNotifications?.find((n) => n.id === notificationId)?.readAt === null;

      // Optimistically update the notification(s) in cache
      queryClient.setQueryData<NotificationDetail[]>(
        notificationKeys.list(),
        (old) => {
          if (!old) return old;

          return old.map((notification) => {
            // Mark as read if it's the specific notification or marking all as read
            if (
              notificationId === 'all' ||
              notification.id === notificationId
            ) {
              return { ...notification, readAt: now };
            }
            return notification;
          });
        },
      );

      // Optimistically update unread count
      queryClient.setQueryData<number>(
        notificationKeys.unreadCount(),
        (oldCount) => {
          if (oldCount === undefined) return oldCount;

          if (notificationId === 'all') {
            return 0;
          }

          // Only decrement if notification was unread
          if (wasUnread) {
            return Math.max(0, oldCount - 1);
          }

          return oldCount;
        },
      );
    },
  });
}
