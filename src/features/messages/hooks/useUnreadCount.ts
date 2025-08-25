import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { messageKeys } from '../queries';

export function useUnreadCount(
  options?: Partial<UseQueryOptions<number, Error>>
) {
  const client = useSupabase();

  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: async () => {
      const { data: userData, error: userError } = await client.auth.getUser();
      
      if (userError || !userData?.user) {
        return 0;
      }

      const { data, error } = await client
        .from('conversation_participants')
        .select('unread_count')
        .eq('user_id', userData.user.id)
        .gt('unread_count', 0);

      if (error || !data) {
        return 0;
      }

      return data.reduce((total, participant) => total + participant.unread_count, 0);
    },
    enabled: !!client,
    refetchInterval: 30000, // Refetch every 30 seconds
    ...options,
  });
}