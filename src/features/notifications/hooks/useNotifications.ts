import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useRef } from 'react';
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
 * Updates are handled by polling every 30 seconds with incremental fetching.
 * Only new notifications since the last fetch are retrieved to minimize bandwidth.
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
  const queryClient = useQueryClient();
  const lastFetchTimeRef = useRef<Date | null>(null);

  const query = useQuery<NotificationDetail[], Error>({
    queryKey: notificationKeys.list(),
    queryFn: async () => {
      if (!supabase || !currentUser) {
        throw new Error('Supabase client or user not available');
      }

      // For incremental fetching, use the last fetch time
      const filterWithSince: FetchNotificationsFilter = {
        ...filter,
        since: lastFetchTimeRef.current ?? undefined,
      };

      // Capture timestamp at START of fetch to avoid missing notifications created during the fetch
      const fetchStartTime = new Date();

      const newNotifications = await fetchNotifications(
        supabase,
        currentUser.id,
        filterWithSince,
      );

      // Update last fetch time to when we STARTED this fetch
      lastFetchTimeRef.current = fetchStartTime;

      // If this is an incremental fetch, merge with existing data
      if (filterWithSince.since) {
        const existingData =
          queryClient.getQueryData<NotificationDetail[]>(
            notificationKeys.list(),
          ) ?? [];

        // Merge new notifications with existing ones
        // Prepend new notifications and deduplicate by ID
        const merged = [...newNotifications, ...existingData];
        const deduped = Array.from(
          new Map(merged.map((n) => [n.id, n])).values(),
        );

        // Sort by created_at descending (newest first)
        return deduped.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      }

      // Initial fetch - return all notifications
      return newNotifications;
    },
    enabled: !!supabase && !!currentUser,
    refetchInterval: 30000, // Poll every 30 seconds for updates
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
