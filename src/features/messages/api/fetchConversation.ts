import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import {
  ConversationRowWithParticipants,
  SELECT_CONVERSATIONS_JOIN_PARTICIPANTS,
} from '../types/messageRow';
import { toDomainConversation } from '../transformers';
import { appendQuery, logger } from '../../../shared';

export async function fetchConversation(
  supabase: SupabaseClient<Database>,
  {
    communityId,
    conversationId,
  }: {
    communityId?: string;
    conversationId?: string;
  },
): Promise<Conversation> {
  if (!communityId && !conversationId) {
    throw new Error('Must provide either communityId or conversationId');
  }

  if (communityId && conversationId) {
    throw new Error(
      'Must provide either communityId or conversationId, not both',
    );
  }

  let query = supabase
    .from('conversations')
    .select(SELECT_CONVERSATIONS_JOIN_PARTICIPANTS)
    .eq('conversation_type', communityId ? 'community' : 'direct');

  query = appendQuery(query, 'conversation_id', conversationId, 'id');
  query = appendQuery(query, 'community_id', communityId);

  const { data, error } = (await query.maybeSingle()) as {
    data: ConversationRowWithParticipants | null;
    error: Error | null;
  };

  if (error) {
    logger.error('Error fetching conversation', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Conversation not found');
  }

  return toDomainConversation(data);
}
