import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@/shared';
import { useSupabase } from '@/shared';
import { sendCommunityMessage } from '@/features/messages/api/sendMessage';
import { conversationKeys, messageKeys } from '../queries';

import type { Message, SendCommunityMessageInput } from '@/features/messages/types';

/**
 * Hook for sending messages to community chat.
 *
 * Directly sends messages to community using community_id.
 *
 * @returns Mutation for sending community messages
 *
 * @example
 * ```tsx
 * function SendMessageForm({ communityId }) {
 *   const [content, setContent] = useState('');
 *   const sendMessage = useSendCommunityMessage();
 *
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     sendMessage.mutate({
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
 *         disabled={!content.trim() || sendMessage.isPending}
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
    mutationFn: (input: SendCommunityMessageInput) => {
      return sendCommunityMessage(supabase, input);
    },
    onSuccess: (data, variables) => {
      logger.info('💬 Successfully sent community message', {
        messageId: data.id,
        communityId: variables.communityId,
      });

      // Invalidate community messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.communityMessages(variables.communityId),
      });

      // Invalidate community chats
      queryClient.invalidateQueries({
        queryKey: conversationKeys.communityChats(),
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