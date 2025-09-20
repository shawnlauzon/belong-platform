import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DirectConversation, CommunityChat, ConversationType } from '../types';
import {
  ConversationRowWithParticipants,
  SELECT_CONVERSATIONS_JOIN_PARTICIPANTS,
} from '../types/messageRow';
import { toDomainDirectConversation, toDomainCommunityChat } from '../transformers';
import { appendQueries, logger } from '../../../shared';

export async function fetchConversations(
  supabase: SupabaseClient<Database>,
  userId: string,
  type?: ConversationType,
): Promise<Array<DirectConversation | CommunityChat>> {
  // First, get the conversation IDs where the user is a participant
  const participantQuery = supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', userId);

  const { data: participantData, error: participantError } = await participantQuery;

  if (participantError) {
    logger.error('Error fetching user conversations', { error: participantError });
    throw participantError;
  }

  if (!participantData || participantData.length === 0) {
    return [];
  }

  const conversationIds = participantData.map(p => p.conversation_id);

  // Now get the full conversations with all participants
  let conversationQuery = supabase
    .from('conversations')
    .select(SELECT_CONVERSATIONS_JOIN_PARTICIPANTS)
    .in('id', conversationIds);

  if (type) {
    conversationQuery = appendQueries(conversationQuery, {
      conversation_type: type,
    });
  }

  // Execute the query
  const { data, error } = (await conversationQuery.order('last_message_at', {
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

  return data.map((row) => {
    // Transform based on conversation type
    if (row.conversation_type === 'direct') {
      return toDomainDirectConversation(row);
    } else if (row.conversation_type === 'community') {
      return toDomainCommunityChat(row);
    } else {
      // Fallback for unknown types
      logger.warn('Unknown conversation type', { type: row.conversation_type });
      return toDomainDirectConversation(row);
    }
  });
}
