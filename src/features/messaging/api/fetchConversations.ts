import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import { toDomainConversation } from '../transformers';
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

  const { data: participantData, error: participantError } =
    await participantQuery;

  if (participantError) {
    logger.error('Error fetching user conversations', {
      error: participantError,
    });
    throw participantError;
  }

  if (!participantData || participantData.length === 0) {
    return [];
  }

  const conversationIds = participantData.map((p) => p.conversation_id);

  // Now get the full conversations with all participants and last message using the view
  const { data, error } = await supabase
    .from('conversations_with_last_message')
    .select(
      `
      *,
      conversation_participants!inner(user_id)
    `,
    )
    .in('id', conversationIds);

  if (error) {
    logger.error('Error fetching conversations', { error });
    throw error;
  }

  if (!data) {
    return [];
  }

  // Sort by last message time in JavaScript (most recent first)
  const sortedData = data.sort((a, b) => {
    const aTime = a.last_message_updated_at ? new Date(a.last_message_updated_at).getTime() : 0;
    const bTime = b.last_message_updated_at ? new Date(b.last_message_updated_at).getTime() : 0;
    return bTime - aTime; // Descending order (most recent first)
  });

  return sortedData.map(toDomainConversation);
}
