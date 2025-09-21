import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message, RealtimeBroadcastMessage, SendMessageInput } from '../types';
import { toMessageRow, toDomainMessage } from '../transformers';
import { logger } from '../../../shared';
import { MessageRow } from '../types/messageRow';
import { getCurrentUserOrFail } from '@/features/auth/api';
import {
  messagesChannelForCommunity as messagesTopicForCommunity,
  messagesChannelForConversation as messagesTopicForConversation,
} from '../utils';
import { v4 as uuidv4 } from 'uuid';

export async function sendMessage(
  supabase: SupabaseClient<Database>,
  input: SendMessageInput,
): Promise<Message> {
  if (!input.conversationId && !input.communityId) {
    throw new Error('Must provide either conversationId or communityId');
  }

  logger.info('Sending message', {
    conversationId: input.conversationId,
    communityId: input.communityId,
    contentLength: input.content?.length || 0,
  });

  const user = await getCurrentUserOrFail(supabase);

  const topic = input.conversationId
    ? messagesTopicForConversation(input.conversationId)
    : messagesTopicForCommunity(input.communityId!);

  const channel =
    supabase.getChannels().find((c: RealtimeChannel) => c.topic === topic) ??
    supabase.channel(topic, {
      config: { private: true },
    });

  const messageId = uuidv4();
  console.log('messageId', messageId);

  const messageEvent: RealtimeBroadcastMessage = {
    event: 'message.created',
    type: 'broadcast',
    payload: {
      senderId: user.id,
      messageId,
      content: input.content,
      sentAt: new Date(),
    },
  };

  channel
    .send(messageEvent)
    .catch((err: Error) =>
      console.error(`Failed to send message ${input.content} to ${topic}`, err),
    );

  const { data, error } = (await supabase
    .from('messages')
    .insert({ ...toMessageRow(input), id: messageId })
    .select('*')
    .single()) as {
    data: MessageRow;
    error: Error | null;
  };

  if (error) {
    logger.error('Database error while sending message', {
      error,
      conversationId: input.conversationId,
      communityId: input.communityId,
    });
    throw error;
  }

  if (!data) {
    logger.error('No data returned from message insert', {
      conversationId: input.conversationId,
      communityId: input.communityId,
    });
    throw new Error('Failed to send message');
  }

  const message = toDomainMessage(data);
  logger.info('Message sent', {
    conversationId: input.conversationId,
    communityId: input.communityId,
    contentLength: input.content?.length || 0,
    messageId: message.id,
  });

  return message;
}
