import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { DirectConversation, StartConversationInput } from '../types';
import { logger } from '../../../shared';
import { fetchDirectConversation } from './fetchDirectConversation';

export async function startConversation(
  supabase: SupabaseClient<Database>,
  input: StartConversationInput,
): Promise<DirectConversation> {
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

  const myChannel = supabase.channel(`messages:${input.otherUserId}`);

  myChannel.send({
    type: 'broadcast',
    event: 'conversation',
    payload: {
      message: 'New conversation request',
    },
  });

  logger.debug('Sent conversation request', {
    channel: `messages:${input.otherUserId}`,
    payload: {
      message: 'New conversation request',
    },
  });

  return fetchDirectConversation(supabase, data);
}
