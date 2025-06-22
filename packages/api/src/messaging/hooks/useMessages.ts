import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
import { queryKeys } from '../../shared/queryKeys';

export function useMessages(conversationId: string, filters?: MessageFilter) {
  const supabase = useSupabase();
  const messagingService = createMessagingService(supabase);

  const result = useQuery<MessageInfo[], Error>({
    queryKey: [...queryKeys.messaging.messages(conversationId), filters],
    queryFn: () => messagingService.fetchMessages(conversationId, filters),
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