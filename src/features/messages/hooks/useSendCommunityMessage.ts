import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { sendMessage } from '@/features/messages/api';

import type { Message, SendMessageInput } from '@/features/messages/types';

/**
 * Input for sending a community message
 */
export interface SendCommunityMessageInput {
  communityId: string;
  content: string;
  messageType?: 'text' | 'system';
}

/**
 * Hook for sending messages to community chat.
 *
 * Automatically resolves the community conversation and sends the message.
 *
 * @returns Mutation for sending community messages
 *
 * @example
 * ```tsx
 * function SendMessageForm({ communityId }) {
 *   const [content, setContent] = useState('');
 *   const sendCommunityMessage = useSendCommunityMessage();
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     sendCommunityMessage.mutate({
 *       communityId,
 *       content,
 *     }, {
 *       onSuccess: () => setContent(''),
 *       onError: (error) => alert(error.message),
 *     });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={content}
 *         onChange={(e) => setContent(e.target.value)}
 *         placeholder="Type your message..."
 *       />
 *       <button 
 *         type="submit" 
 *         disabled={!content.trim() || sendCommunityMessage.isPending}
 *       >
 *         Send
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
export function useSendCommunityMessage() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<Message, Error, SendCommunityMessageInput>({
    mutationFn: async (input: SendCommunityMessageInput) => {
      // First, get or create the community conversation
      const conversation = await queryClient.fetchQuery({
        queryKey: ['conversations', 'community', input.communityId],
        queryFn: async () => {
          const { fetchCommunityConversation } = await import('@/features/messages/api');
          return fetchCommunityConversation(supabase, input.communityId);
        },
      });

      if (!conversation) {
        throw new Error('Community conversation not found. Please contact an administrator.');
      }

      // Send the message using the existing sendMessage function
      const messageInput: SendMessageInput = {
        conversationId: conversation.id,
        content: input.content,
        messageType: input.messageType || 'text',
      };

      return sendMessage(supabase, messageInput);
    },
    onSuccess: (data, variables) => {
      logger.info('💬 Successfully sent community message', {
        messageId: data.id,
        communityId: variables.communityId,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ['messages'],
      });
      queryClient.invalidateQueries({
        queryKey: ['conversations', 'community', variables.communityId],
      });
    },
    onError: (error, variables) => {
      logger.error('💬 Failed to send community message', {
        error,
        communityId: variables.communityId,
        content: variables.content,
      });
    },
  });
}