import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { ConversationListFilters, Conversation } from '../types';
import {
  ConversationRowWithParticipants,
  SELECT_CONVERSATIONS_JOIN_PARTICIPANTS,
} from '../types/messageRow';
import { toDomainConversation } from '../transformers';
import { appendQueries, logger } from '../../../shared';

export async function fetchConversations(
  supabase: SupabaseClient<Database>,
  filters?: ConversationListFilters,
): Promise<Conversation[]> {
  let query = supabase
    .from('conversations')
    .select(SELECT_CONVERSATIONS_JOIN_PARTICIPANTS);

  if (filters) {
    query = appendQueries(query, {
      conversation_type: filters.conversationType,
      community_id: filters.communityId,
    });
  }

  // Execute the query
  const { data, error } = (await query.order('last_message_at', {
    ascending: false,
    nullsFirst: false,
  })) as {
    data: ConversationRowWithParticipants[] | null;
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
