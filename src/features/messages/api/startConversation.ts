import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { Conversation, StartConversationInput } from '../types';
import { logger } from '../../../shared';
import { fetchConversation } from './fetchConversation';

export async function startConversation(
  client: SupabaseClient<Database>,
  input: StartConversationInput
): Promise<Conversation> {
  const { error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const { data, error } = await client.rpc('get_or_create_conversation', {
    other_user_id: input.otherUserId,
  });

  if (error) {
    logger.error('Error starting conversation', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create conversation');
  }

  return fetchConversation(client, data);
}