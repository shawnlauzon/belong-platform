import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import { toDomainConversation } from '../transformers';
import { logger } from '../../../shared';

export async function fetchConversation(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<Conversation> {
  const { data, error } = await supabase
    .from('conversations')
    .select(
      `
      *,
      conversation_participants(user_id),
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
    `,
    )
    .eq('id', conversationId)
    .eq('last_message.is_deleted', false)
    .order('created_at', { ascending: false, referencedTable: 'last_message' })
    .limit(1, { referencedTable: 'last_message' })
    .single();

  if (error) {
    logger.error('Error fetching conversation', { error, conversationId });
    throw error;
  }

  if (!data) {
    throw new Error(`Conversation with id ${conversationId} not found`);
  }

  // Transform to domain conversation (only direct conversations now)
  return toDomainConversation({
    id: data.id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    conversation_participants: data.conversation_participants || [],
    last_message: data.last_message?.[0] || null,
  });
}
