import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation, ConversationType } from '../types';
import {
  ConversationRow,
  SELECT_CONVERSATIONS_JOIN_PARTICIPANTS,
} from '../types/messageRow';
import { toDomainConversation } from '../transformers';
import { appendQueries, logger } from '../../../shared';

export async function fetchConversations(
  supabase: SupabaseClient<Database>,
  userId: string,
  type?: ConversationType,
): Promise<Conversation[]> {
  let query = supabase
    .from('conversations')
    .select(SELECT_CONVERSATIONS_JOIN_PARTICIPANTS)
    .eq('conversation_participants.user_id', userId);

  if (type) {
    query = appendQueries(query, {
      conversation_type: type,
    });
  }

  // Execute the query
  const { data, error } = (await query.order('last_message_at', {
    ascending: false,
    nullsFirst: false,
  })) as {
    data: ConversationRow[] | null;
    error: Error | null;
  };

  if (error) {
    logger.error('Error fetching conversations', { error });
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map((row) => toDomainConversation(row));
}
