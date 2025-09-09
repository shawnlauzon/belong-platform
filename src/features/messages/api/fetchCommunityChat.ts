import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { CommunityChat } from '../types';
import { ConversationRow } from '../types/messageRow';
import { logger } from '../../../shared';
import { toDomainCommunityChat } from '../transformers';

export async function fetchCommunityChat(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<CommunityChat> {
  const query = supabase
    .from('conversations')
    .select('*')
    .eq('conversation_type', 'community')
    .eq('community_id', communityId);

  const { data, error } = (await query.maybeSingle()) as {
    data: ConversationRow | null;
    error: Error | null;
  };

  if (error) {
    logger.error('Error fetching conversation', { error });
    throw error;
  }

  if (!data) {
    logger.error('Conversation not found', {
      communityId,
    });
    throw new Error('Conversation not found');
  }

  return toDomainCommunityChat(data);
}
