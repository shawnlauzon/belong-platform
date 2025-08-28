import { logger } from '@/shared';
import { useMessages } from './useMessages';
import { useCommunityConversation } from './useCommunityConversation';

import type { Message } from '@/features/messages/types';

/**
 * Hook for fetching community chat messages.
 *
 * Combines community conversation lookup with message fetching.
 * Returns messages for the community chat if conversation exists.
 *
 * @param communityId - The community ID to fetch messages for
 * @returns Query state for community messages
 *
 * @example
 * ```tsx
 * function CommunityMessageList({ communityId }) {
 *   const { data: messages, isLoading, error } = useCommunityMessages(communityId);
 *
 *   if (isLoading) return <div>Loading messages...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {messages.map(message => (
 *         <div key={message.id}>
 *           <strong>{message.sender.displayName}</strong>: {message.content}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
interface UseCommunityMessagesResult {
  data: Message[];
  isLoading: boolean;
  error?: Error | null;
}

export function useCommunityMessages(communityId: string): UseCommunityMessagesResult {
  // First get the community conversation
  const { data: conversation, error: conversationError } = useCommunityConversation(communityId);

  // Then get messages for that conversation
  // Note: useMessages doesn't support filters or options - it loads all messages for the conversation
  const messagesQuery = useMessages(conversation?.id || '');

  // If there's a conversation error, we want to surface that
  if (conversationError) {
    logger.error('💬 API: Error fetching community conversation for messages', {
      error: conversationError,
      communityId,
    });
    
    return {
      data: [],
      isLoading: false,
      error: conversationError,
    };
  }

  return {
    data: messagesQuery.data,
    isLoading: messagesQuery.isLoading,
    error: null,
  };
}