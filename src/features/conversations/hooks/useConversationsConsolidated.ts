import { useQueryClient } from '@tanstack/react-query';
import type { ConversationFilter } from '../types';
import { queryKeys, useSupabase } from '../../../shared';
import { createConversationsService } from '../services/conversations.service';

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

    // Note: Individual conversation fetch (byId) not implemented yet in conversations service
    // This would require adding a fetchConversationById method to conversations.service.ts

    // Sub-entity operation - following communities.memberships pattern
    messages: async (conversationId: string) => {
      const result = await queryClient.fetchQuery({
        queryKey: queryKeys.conversations.messages(conversationId),
        queryFn: () => conversationsService.fetchMessages(conversationId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
      return result;
    },
  };

  return result;
}
