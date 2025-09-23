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
    .from('conversations_with_last_message')
    .select(
      `
      *,
      conversation_participants(user_id)
    `,
    )
    .eq('id', conversationId)
    .single();

  if (error) {
    logger.error('Error fetching conversation', { error, conversationId });
    throw error;
  }

  if (!data) {
    throw new Error(`Conversation with id ${conversationId} not found`);
  }

  // Transform to domain conversation (only direct conversations now)
  return toDomainConversation(data);
}
