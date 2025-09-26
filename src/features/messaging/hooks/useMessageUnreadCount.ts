import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchMessageUnreadCount, fetchTotalMessageUnreadCount } from '../api/fetchMessageUnreadCount';
import { conversationKeys } from '../queries';
import { STANDARD_CACHE_TIME } from '@/config';

interface UseMessageUnreadCountResult {
  data: number | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

/**
 * Hook for fetching unread message count for a specific conversation.
 *
 * Real-time updates are handled by MessageRealtimeProvider.
 *
 * @param conversationId - The ID of the conversation
 * @returns Query state for unread message count
 *
 * @example
 * ```tsx
 * function ConversationItem({ conversationId }) {
 *   const { data: unreadCount, isLoading } = useMessageUnreadCount(conversationId);
 *
 *   if (isLoading) return null;
 *   if (!unreadCount) return null;
 *
 *   return <Badge count={unreadCount} />;
 * }
 * ```
 */
export function useMessageUnreadCount(conversationId: string): UseMessageUnreadCountResult {
  const supabase = useSupabase();

  const query = useQuery({
    queryKey: conversationKeys.unreadCount(conversationId),
    queryFn: () => fetchMessageUnreadCount(supabase, conversationId),
    enabled: !!supabase && !!conversationId,
    staleTime: STANDARD_CACHE_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Hook for fetching total unread message count across all conversations.
 *
 * Real-time updates are handled by MessageRealtimeProvider.
 *
 * @returns Query state for total unread message count
 *
 * @example
 * ```tsx
 * function MessagesBadge() {
 *   const { data: totalUnreadCount, isLoading } = useTotalMessageUnreadCount();
 *
 *   if (isLoading) return null;
 *   if (!totalUnreadCount) return null;
 *
 *   return <Badge count={totalUnreadCount} />;
 * }
 * ```
 */
export function useTotalMessageUnreadCount(): UseMessageUnreadCountResult {
  const supabase = useSupabase();

  const query = useQuery({
    queryKey: conversationKeys.totalUnreadCount(),
    queryFn: () => fetchTotalMessageUnreadCount(supabase),
    enabled: !!supabase,
    staleTime: STANDARD_CACHE_TIME,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}