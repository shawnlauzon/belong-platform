import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import { ConversationWithParticipants } from '../types/messageRow';
import { transformConversation } from '../transformers';
import { logger } from '../../../shared';

export async function fetchConversation(
  client: SupabaseClient<Database>,
  conversationId: string
): Promise<Conversation> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  const { data, error } = await client
    .from('conversations')
    .select(`
      *,
      conversation_participants!inner(
        user_id,
        unread_count,
        last_read_at,
        profiles(*)
      )
    `)
    .eq('id', conversationId)
    .single();

  if (error) {
    logger.error('Error fetching conversation', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Conversation not found');
  }

  const participants = data.conversation_participants as Array<{
    user_id: string;
    unread_count: number;
    last_read_at: string | null;
    profiles: Database['public']['Tables']['profiles']['Row'];
  }>;
  
  if (!participants.some(p => p.user_id === userId)) {
    throw new Error('Unauthorized to view this conversation');
  }

  return transformConversation(data as ConversationWithParticipants, userId);
}