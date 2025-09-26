import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Message } from '../types';
import { toDomainMessage } from '../transformers';
import { MessageRow } from '../types/messageRow';
import { logger } from '@/shared';

interface FetchMessagesSource {
  conversationId?: string;
  communityId?: string;
}

/**
 * Fetches messages for a specific conversation or community, with the newest messages being last.
 */
export async function fetchMessages(
  supabase: SupabaseClient<Database>,
  source: FetchMessagesSource,
): Promise<Message[]> {
  const { conversationId, communityId } = source;

  if (!conversationId && !communityId) {
    throw new Error('Either conversationId or communityId must be provided');
  }

  const query = supabase.from('messages').select('*');

  if (conversationId) {
    query.eq('conversation_id', conversationId);
  } else if (communityId) {
    query.eq('community_id', communityId);
  }

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
    communityId,
    messages: data,
  });

  return data.map((row) => toDomainMessage(row));
}
