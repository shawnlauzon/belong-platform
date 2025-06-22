import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
import { queryKeys } from '../../shared/queryKeys';

export function useConversations(userId: string, filters?: ConversationFilter) {
  const supabase = useSupabase();
  const messagingService = createMessagingService(supabase);

  const result = useQuery<ConversationInfo[], Error>({
    queryKey: [...queryKeys.messaging.userConversations(userId), filters],
    queryFn: () => messagingService.fetchConversations(userId, filters),
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