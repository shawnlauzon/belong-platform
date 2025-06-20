import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { MessageInfo, MessageFilter } from '@belongnetwork/types';
import { fetchMessages } from '../impl/fetchMessages';
import { queryKeys } from '../../shared/queryKeys';

export function useMessages(conversationId: string, filters?: MessageFilter) {
  const result = useQuery<MessageInfo[], Error>({
    queryKey: [...queryKeys.messaging.messages(conversationId), filters],
    queryFn: () => fetchMessages(conversationId, filters),
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