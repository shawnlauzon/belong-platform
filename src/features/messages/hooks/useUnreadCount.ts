import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { messageKeys } from '../queries';

export interface UnreadCountResult {
  total: number;
  byConversation: Record<string, number>;
}

export function useUnreadCount(
  options?: Partial<UseQueryOptions<UnreadCountResult, Error>>
) {
  const client = useSupabase();

  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      
      if (userError || !userData?.user) {
        return { total: 0, byConversation: {} };
      }

      const { data, error } = await client
        .from('conversation_participants')
        .select('conversation_id, unread_count')
        .eq('user_id', userData.user.id)
        .gt('unread_count', 0);

      if (error || !data) {
        return { total: 0, byConversation: {} };
      }

      const byConversation = data.reduce((map, participant) => {
        map[participant.conversation_id] = participant.unread_count;
        return map;
      }, {} as Record<string, number>);

      const total = data.reduce((sum, participant) => sum + participant.unread_count, 0);

      return { total, byConversation };
    },
    enabled: !!client,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
}