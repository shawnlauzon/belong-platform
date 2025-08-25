import { useSupabase } from '../../../shared/hooks';
import { sendMessage } from '../api';
import { SendMessageInput, Message } from '../types';
import { logger } from '../../../shared';

export function useSendMessage() {
  const client = useSupabase();

  const mutate = async (input: SendMessageInput): Promise<Message> => {
    logger.info('useSendMessage: initiating message send', {
      conversationId: input.conversationId,
      messageType: input.messageType || 'text',
      hasContent: !!input.content
    });

    try {
      const result = await sendMessage(client, input);
      
      logger.info('useSendMessage: message sent successfully', {
        messageId: result.id,
        conversationId: result.conversationId,
        senderId: result.senderId
      });

      return result;
    } catch (error) {
      logger.error('useSendMessage: failed to send message', {
        error,
        conversationId: input.conversationId,
        messageType: input.messageType || 'text'
      });
      throw error;
    }
  };

  return { mutate };
}