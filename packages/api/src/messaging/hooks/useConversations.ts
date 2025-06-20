import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { fetchConversations } from '../impl/fetchConversations';
import { queryKeys } from '../../shared/queryKeys';

export function useConversations(userId: string, filters?: ConversationFilter) {
  const result = useQuery<ConversationInfo[], Error>({
    queryKey: [...queryKeys.messaging.conversations(userId), filters],
    queryFn: () => fetchConversations(userId, filters),
    enabled: !!userId,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('💬 useConversations: Error fetching conversations', { 
      error: result.error,
      userId,
    });
  }

  return result;
}