import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message } from '../types';
import { toDomainMessage } from '../transformers';
import { MessageRow } from '../types/messageRow';
import { logger } from '@/shared';

/**
 * Fetches messages for a specific conversation, with the newest messages being last.
 */
export async function fetchMessages(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<Message[]> {
  const query = supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false);

  // Execute the query
  const { data, error } = (await query.order('created_at', {
    ascending: true,
  })) as {
    data: MessageRow[] | null;
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  logger.debug('Fetched messages', {
    conversationId,
    messages: data,
  });

  return data.map((row) => toDomainMessage(row));
}
