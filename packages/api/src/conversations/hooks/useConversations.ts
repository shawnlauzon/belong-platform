import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../shared/queryKeys';

/**
 * Hook for managing conversation operations including listing and filtering conversations.
 * 
 * This hook provides functionality for fetching user conversations, applying filters,
 * and managing the conversation list in messaging applications. Follows the platform
 * pattern with manual fetch operations. Must be used within a BelongProvider context.
 * 
 * @returns Conversation operations and utilities
 * 
 * @example
 * ```tsx
 * function ConversationList() {
 *   const { list } = useConversations();
 *   const [conversations, setConversations] = useState([]);
 * 
 *   // Load user's conversations
 *   const handleLoad = async () => {
 *     try {
 *       const convos = await list();
 *       setConversations(convos);
 *     } catch (error) {
 *       console.error('Failed to load conversations:', error);
 *     }
 *   };
 * 
 *   // Load conversations with filter
 *   const handleLoadUnread = async () => {
 *     try {
 *       const convos = await list({ unreadOnly: true });
 *       setConversations(convos);
 *     } catch (error) {
 *       console.error('Failed to load unread conversations:', error);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       <button onClick={handleLoad}>Load All</button>
 *       <button onClick={handleLoadUnread}>Load Unread</button>
 *       {conversations.map(conversation => (
 *         <div key={conversation.id}>
 *           {conversation.lastMessagePreview}
 *           {conversation.unreadCount > 0 && (
 *             <span>({conversation.unreadCount} unread)</span>
 *           )}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 * 
 * @category React Hooks
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