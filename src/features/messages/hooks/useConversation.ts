import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchConversation } from '../api';
import { messageKeys } from '../queries';
import type { Conversation } from '../types';

export function useConversation(
  conversationId: string,
  options?: Partial<UseQueryOptions<Conversation, Error>>
) {
  const client = useSupabase();

  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => fetchConversation(client, conversationId),
    enabled: !!client && !!conversationId,
    ...options,
  });
}