import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import {
  ConversationRowWithLastMessage,
} from '../types/messageRow';
import {
  toDomainConversation,
} from '../transformers';
import { logger } from '../../../shared';

export async function fetchConversations(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Conversation[]> {
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

  // Now get the full conversations with all participants and last message
  const conversationQuery = supabase
    .from('conversations')
    .select(`
      *,
      conversation_participants!inner(user_id),
      last_message:messages(
        id,
        content,
        sender_id,
        created_at,
        is_deleted,
        conversation_id,
        community_id,
        encryption_version,
        is_edited,
        updated_at
      )
    `)
    .in('id', conversationIds)
    .order('created_at', { ascending: false, referencedTable: 'last_message' })
    .limit(1, { referencedTable: 'last_message' });

  const { data, error } = await conversationQuery;

  if (error) {
    logger.error('Error fetching conversations', { error });
    throw error;
  }

  if (!data) {
    return [];
  }

  // Order by the most recent message timestamp, fallback to conversation created_at
  const sortedData = data.sort((a, b) => {
    const aTime = a.last_message?.[0]?.created_at || a.created_at;
    const bTime = b.last_message?.[0]?.created_at || b.created_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  return sortedData.map((dbRow) => {
    // Transform the database response to our expected type structure
    const row: ConversationRowWithLastMessage = {
      id: dbRow.id,
      created_at: dbRow.created_at,
      updated_at: dbRow.updated_at,
      conversation_participants: dbRow.conversation_participants || [],
      last_message: dbRow.last_message?.[0] || null,
    };

    return toDomainConversation(row);
  });
}
