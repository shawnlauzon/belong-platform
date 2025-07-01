import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger, useSupabase } from '../../../shared';
import type { MessageData, MessageInfo } from '../types';
import { createConversationsService } from '../services/conversations.service';
import { queryKeys } from '../../../api/shared/queryKeys';

/**
 * React Query mutation hook for sending messages in conversations.
 *
 * This hook handles sending new messages and automatically updates the cache
 * to reflect the new message in both the conversation list and message list.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation object for sending messages
 *
 * @example
 * ```tsx
 * function MessageInput({ conversationId }) {
 *   const [content, setContent] = useState('');
 *   const sendMessage = useSendMessage();
 *
 *   const handleSend = async () => {
 *     if (!content.trim()) return;
 *
 *     try {
 *       const message = await sendMessage.mutateAsync({
 *         conversationId,
 *         content: content.trim()
 *       });
 *       setContent('');
 *       console.log('Message sent:', message.id);
 *     } catch (error) {
 *       console.error('Failed to send message:', error.message);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input
 *         value={content}
 *         onChange={(e) => setContent(e.target.value)}
 *         placeholder="Type a message..."
 *         onKeyPress={(e) => e.key === 'Enter' && handleSend()}
 *       />
 *       <button
 *         onClick={handleSend}
 *         disabled={sendMessage.isPending || !content.trim()}
 *       >
 *         {sendMessage.isPending ? 'Sending...' : 'Send'}
 *       </button>
 *       {sendMessage.error && (
 *         <div>Error: {sendMessage.error.message}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Creating a new conversation by sending the first message
 * function StartConversation({ recipientId }) {
 *   const sendMessage = useSendMessage();
 *
 *   const handleStart = async () => {
 *     try {
 *       await sendMessage.mutateAsync({
 *         recipientId, // Will create new conversation
 *         content: 'Hello! I saw your resource posting.'
 *       });
 *       // Navigate to conversation...
 *     } catch (error) {
 *       console.error('Failed to start conversation:', error);
 *     }
 *   };
 *
 *   return <button onClick={handleStart}>Send Message</button>;
 * }
 * ```
 *
 * @category React Hooks
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const conversationsService = createConversationsService(supabase);

  return useMutation<MessageInfo, Error, MessageData>({
    mutationFn: (messageData) => conversationsService.sendMessage(messageData),
    onSuccess: (newMessage) => {
      // Invalidate all user conversations to reflect new message
      queryClient.invalidateQueries({
        queryKey: ['user', 'conversations'],
      });

      // Invalidate messages for this conversation
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.messages(newMessage.conversationId),
      });

      logger.info('💬 useSendMessage: Successfully sent message', {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
      });
    },
    onError: (error) => {
      logger.error('💬 useSendMessage: Failed to send message', { error });
    },
  });
}
