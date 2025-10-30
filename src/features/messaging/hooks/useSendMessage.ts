import { useSupabase } from '../../../shared/hooks';
import { useCurrentUser } from '@/features/auth';
import { sendMessage } from '../api';
import { SendMessageInput, Message } from '../types';
import { logger } from '../../../shared';
import { useQueryClient } from '@tanstack/react-query';
import { conversationKeys, communityChatKeys } from '../queries';

export function useSendMessage() {
  const client = useSupabase();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  const mutate = async (input: SendMessageInput): Promise<Message> => {
    if (!currentUser) {
      throw new Error('User must be authenticated to send messages');
    }

    logger.info('useSendMessage: initiating message send', {
      conversationId: input.conversationId,
      communityId: input.communityId,
      hasContent: !!input.content,
    });

    try {
      const result = await sendMessage(client, currentUser.id, input);

      logger.info('useSendMessage: message sent successfully', {
        messageId: result.id,
        conversationId: result.conversationId,
        communityId: result.communityId,
        senderId: result.senderId,
      });

      // Add message to message list
      queryClient.setQueryData(
        input.conversationId
          ? conversationKeys.messages(input.conversationId)
          : communityChatKeys.messages(input.communityId!),
        (oldData: Message[] | undefined) => {
          if (!oldData) return [result];
          return [...oldData, result];
        },
      );

      // Invalidate conversations list to update last message
      if (input.conversationId) {
        queryClient.invalidateQueries({
          queryKey: conversationKeys.list(),
        });
      } else if (input.communityId) {
        queryClient.invalidateQueries({
          queryKey: communityChatKeys.list(),
        });
      }

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
