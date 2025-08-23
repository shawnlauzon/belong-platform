import { useInfiniteQuery } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchConversations } from '../api';
import { messageKeys } from '../queries';
import { ConversationListFilters } from '../types';

export function useConversations(filters?: ConversationListFilters) {
  const client = useSupabase();

  return useInfiniteQuery({
    queryKey: [...messageKeys.conversations(), filters],
    queryFn: ({ pageParam }) => 
      fetchConversations(client, filters, 20, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    enabled: !!client,
  });
}