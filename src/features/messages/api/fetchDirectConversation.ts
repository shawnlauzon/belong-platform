import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DirectConversation } from '../types';
import {
  ConversationRowWithParticipants,
  SELECT_CONVERSATIONS_JOIN_PARTICIPANTS,
} from '../types/messageRow';
import { toDomainDirectConversation } from '../transformers';
import { logger } from '../../../shared';

export async function fetchDirectConversation(
  supabase: SupabaseClient<Database>,
  conversationId: string,
): Promise<DirectConversation> {
  const query = supabase
    .from('conversations')
    .select(SELECT_CONVERSATIONS_JOIN_PARTICIPANTS)
    .eq('conversation_type', 'direct')
    .eq('id', conversationId);

  const { data, error } = (await query.maybeSingle()) as {
    data: ConversationRowWithParticipants | null;
    error: Error | null;
  };

  if (error) {
    logger.error('Error fetching conversation', { error });
    throw error;
  }

  if (!data) {
    logger.error('Conversation not found', {
      conversationId,
    });
    throw new Error('Conversation not found');
  }

  return toDomainDirectConversation(data);
}
