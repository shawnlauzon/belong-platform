import { UseQueryOptions } from '@tanstack/react-query';
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
 * @param options - Optional React Query options
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
 *       {messages?.map(message => (
 *         <div key={message.id}>
 *           <strong>{message.sender.displayName}</strong>: {message.content}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCommunityMessages(
  communityId: string,
  options?: Partial<UseQueryOptions<Message[], Error>>
) {
  // First get the community conversation
  const { data: conversation, error: conversationError } = useCommunityConversation(communityId);

  // Then get messages for that conversation
  const messagesQuery = useMessages(conversation?.id || '', options);

  // If there's a conversation error, log it
  if (conversationError) {
    logger.error('useCommunityMessages: Error fetching community conversation', {
      error: conversationError,
      communityId,
    });
  }

  // Return the messages query directly - it handles the error state
  return messagesQuery;
}