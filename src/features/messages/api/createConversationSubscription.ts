import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { conversationKeys } from '../queries';
import { logger } from '@/shared';
import { channelManager } from './channelManager';

export interface CreateConversationSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
}

/**
 * Creates a subscription for new conversations with the given user ID.
 */
export async function createConversationSubscription({
  supabase,
  queryClient,
  userId,
}: CreateConversationSubscriptionParams): Promise<RealtimeChannel> {
  // Get the conversations channel from the channel manager
  const channel = channelManager.getConversationsChannel(supabase, userId);

  // Add our listener to handle conversation broadcasts
  channel.on(
    'broadcast',
    {
      event: 'conversation',
    },
    (payload) => {
      logger.debug(
        'Received conversation broadcast',
        JSON.stringify(payload),
      );

      queryClient.invalidateQueries({
        queryKey: conversationKeys.lists(),
      });
    },
  );

  return channel;
}
