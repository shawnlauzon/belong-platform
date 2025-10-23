import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { fetchNotificationUnreadCount } from '../api/fetchNotificationUnreadCount';
import { notificationKeys } from '../queries';

interface UseNotificationUnreadCountResult {
  data: number | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Hook for fetching unread notification count.
 *
 * Updates are handled by polling every 30 seconds.
 *
 * @returns Query state for unread notification count
 *
 * @example
 * ```tsx
 * function NotificationBadge() {
 *   const { data: unreadCount, isLoading } = useNotificationUnreadCount();
 *
 *   if (isLoading) return null;
 *   if (!unreadCount) return null;
 *
 *   return <Badge count={unreadCount} />;
 * }
 * ```
 */
export function useNotificationUnreadCount(): UseNotificationUnreadCountResult {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  const query = useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => fetchNotificationUnreadCount(supabase, currentUser!.id),
    enabled: !!supabase && !!currentUser,
    refetchInterval: 30000, // Poll every 30 seconds for updates
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}