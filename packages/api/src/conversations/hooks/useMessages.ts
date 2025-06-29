import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

export function useMessages(conversationId: string, filters?: MessageFilter) {
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  const result = useQuery<MessageInfo[], Error>({
    queryKey: [...queryKeys.conversations.messages(conversationId), filters],
    queryFn: () => conversationsService.fetchMessages(conversationId, filters),
    enabled: !!conversationId,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('💬 useMessages: Error fetching messages', { 
      error: result.error,
      conversationId,
    });
  }

  return result;
}