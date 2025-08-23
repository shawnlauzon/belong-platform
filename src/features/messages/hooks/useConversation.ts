import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchConversation } from '../api';
import { messageKeys } from '../queries';

export function useConversation(conversationId: string) {
  const client = useSupabase();

  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => fetchConversation(client, conversationId),
    enabled: !!client && !!conversationId,
  });
}