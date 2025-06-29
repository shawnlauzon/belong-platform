import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
import { queryKeys } from '../../shared/queryKeys';

/**
 * Consolidated hook for all conversation operations
 * Following the platform pattern like useCommunities
 */
export function useConversations() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const messagingService = createMessagingService(supabase);

  const result = {
    // List fetch operation - following platform pattern
    list: async (filters?: ConversationFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.messaging.all,
        queryFn: () => messagingService.fetchConversations('', filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
      return result;
    },
  };

  return result;
}