import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import type { NotificationDetail } from '../types/notificationDetail';
import {
  fetchNotifications,
  type FetchNotificationsFilter,
} from '../api/fetchNotifications';
import { useCurrentUser } from '@/features/auth';
import { notificationKeys } from '../queries';

/**
 * Hook for fetching notifications.
 *
 * Updates are handled by polling every 5 seconds.
 *
 * @param options - Optional React Query options
 * @returns Query state for notifications
 *
 * @example
 * ```tsx
 * function NotificationList() {
 *   const { data: notifications, isLoading, error } = useNotifications();
 *
 *   if (isLoading) return <div>Loading notifications...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {notifications?.map(notification => (
 *         <NotificationItem key={notification.id} notification={notification} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useNotifications(
  filter?: FetchNotificationsFilter,
  options?: Partial<UseQueryOptions<NotificationDetail[], Error>>,
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<NotificationDetail[], Error>({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      if (!supabase || !currentUser) {
        throw new Error('Supabase client or user not available');
      }

      const data = await fetchNotifications(supabase, filter);

      return data;
    },
    enabled: !!supabase && !!currentUser,
    refetchInterval: 5000, // Poll every 5 seconds for updates
    ...options,
  });

  if (query.error) {
    logger.error('useNotifications: Query error', {
      error: query.error,
      userId: currentUser?.id,
    });
  }

  return query;
}
