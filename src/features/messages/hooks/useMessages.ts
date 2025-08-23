import { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchMessages } from '../api';
import { messageKeys } from '../queries';

export function useMessages(conversationId: string) {
  const client = useSupabase();

  return useInfiniteQuery({
    queryKey: messageKeys.messages(conversationId),
    queryFn: ({ pageParam }) => 
      fetchMessages(client, { 
        conversationId, 
        cursor: pageParam,
        limit: 50 
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!client && !!conversationId,
  });
}