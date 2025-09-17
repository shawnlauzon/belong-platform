import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation } from '../types';
import { logger } from '../../../shared';

export async function fetchConversation(
  _client: SupabaseClient<Database>,
  conversationId: string
): Promise<Conversation> {
  // TODO: Implement fetchConversation when conversation schema is finalized
  logger.info('fetchConversation called', { conversationId });
  throw new Error('fetchConversation is not yet implemented');
}