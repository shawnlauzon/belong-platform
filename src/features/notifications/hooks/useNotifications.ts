import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import type { NotificationDetail } from '../types/notificationDetail';
import { fetchNotifications, type FetchNotificationsFilter } from '../api/fetchNotifications';
import { useCurrentUser } from '@/features/auth';
import { notificationKeys } from '../queries';

/**
 * Hook for fetching notifications.
 * 
 * Real-time updates are handled by NotificationRealtimeProvider.
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
  options?: Partial<UseQueryOptions<NotificationDetail[], Error>>
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery<NotificationDetail[], Error>({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      if (!supabase || !currentUser) {
        throw new Error('Supabase client or user not available');
      }

      logger.debug('useNotifications: loading notifications', {
        userId: currentUser.id,
      });

      const data = await fetchNotifications(supabase, filter);

      logger.info('useNotifications: notifications loaded', {
        userId: currentUser.id,
        notificationCount: data.length,
      });

      return data;
    },
    enabled: !!supabase && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes - real-time updates handle freshness
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
