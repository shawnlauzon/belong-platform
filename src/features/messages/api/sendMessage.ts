import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message, SendMessageInput } from '../types';
import { toMessageRow, toDomainMessage } from '../transformers';
import { logger } from '../../../shared';
import { MessageRow } from '../types/messageRow';

export async function sendMessage(
  client: SupabaseClient<Database>,
  input: SendMessageInput,
): Promise<Message> {
  logger.info('Starting message send process', {
    conversationId: input.conversationId,
    contentLength: input.content?.length || 0,
  });

  const { data, error } = (await client
    .from('messages')
    .insert(toMessageRow(input))
    .select('*')
    .single()) as {
    data: MessageRow;
    error: Error | null;
  };

  if (error) {
    logger.error('Database error while sending message', {
      error,
      conversationId: input.conversationId,
    });
    throw error;
  }

  if (!data) {
    logger.error('No data returned from message insert', {
      conversationId: input.conversationId,
    });
    throw new Error('Failed to send message');
  }

  return toDomainMessage(data);
}
