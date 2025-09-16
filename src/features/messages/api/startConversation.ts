import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DirectConversation, StartConversationInput } from '../types';
import { logger } from '../../../shared';
import { fetchDirectConversation } from './fetchDirectConversation';
import { getCurrentAuthUser } from '@/features/auth/api';
import { channelManager } from './channelManager';

export async function startConversation(
  supabase: SupabaseClient<Database>,
  input: StartConversationInput,
): Promise<DirectConversation> {
  const myUser = await getCurrentAuthUser(supabase);

  const { data, error } = (await supabase.rpc('get_or_create_conversation', {
    other_user_id: input.otherUserId,
  })) as {
    data: string;
    error: Error | null;
  };

  if (error) {
    logger.error('Error starting conversation', { error });
    throw error;
  }

  if (!data) {
    throw new Error('Failed to create conversation');
  }

  // Broadcast the conversation request using the channel manager
  const channel = channelManager.getConversationsChannel(supabase, input.otherUserId);

  const payload = {
    message: `New conversation request from ${myUser?.id}`,
  };

  await channelManager.broadcast(channel, 'conversation', payload);

  logger.debug('Sent conversation request', {
    otherUserId: input.otherUserId,
    payload,
  });

  return fetchDirectConversation(supabase, data);
}
