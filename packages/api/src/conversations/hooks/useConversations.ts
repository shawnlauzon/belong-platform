import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

/**
 * Consolidated hook for all conversation operations
 * Following the platform pattern like useCommunities
 */
export function useConversations() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  const result = {
    // List fetch operation - following platform pattern
    list: async (filters?: ConversationFilter) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.conversations.all,
        queryFn: () => conversationsService.fetchConversations('', filters),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
      return result;
    },
  };

  return result;
}