import { useSupabase } from '../../../shared/hooks';
import { sendMessage } from '../api';
import { SendMessageInput, Message } from '../types';
import { logger } from '../../../shared';
import { useQueryClient } from '@tanstack/react-query';
import { messageKeys } from '../queries';

export function useSendMessage() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  const mutate = async (input: SendMessageInput): Promise<Message> => {
    logger.info('useSendMessage: initiating message send', {
      conversationId: input.conversationId,
      communityId: input.communityId,
      hasContent: !!input.content,
    });

    try {
      const result = await sendMessage(client, input);

      logger.info('useSendMessage: message sent successfully', {
        messageId: result.id,
        conversationId: result.conversationId,
        communityId: result.communityId,
        senderId: result.senderId,
      });

      // Add message to message list
      queryClient.setQueryData(
        input.conversationId
          ? messageKeys.list(input.conversationId)
          : messageKeys.communityMessages(input.communityId!),
        (oldData: Message[] | undefined) => {
          if (!oldData) return [result];
          return [...oldData, result];
        },
      );

      return result;
    } catch (error) {
      logger.error('useSendMessage: failed to send message', {
        error,
        conversationId: input.conversationId,
        communityId: input.communityId,
      });
      throw error;
    }
  };

  return { mutate };
}
