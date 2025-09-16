import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { messageKeys } from '../queries';
import { logger } from '@/shared';
import { channelManager } from './channelManager';

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  conversationId: string;
}

/**
 * Creates a subscription for new messages in a given conversation.
 */
export async function createMessageSubscription({
  supabase,
  queryClient,
  conversationId,
}: CreateMessageSubscriptionParams): Promise<RealtimeChannel> {
  // Get the messages channel from the channel manager
  const channel = channelManager.getMessagesChannel(supabase, conversationId);

  // Add our listener to handle message broadcasts
  channel
    .on(
      'broadcast',
      {
        event: 'message',
      },
      (payload) => {
        logger.debug('Received message broadcast', JSON.stringify(payload));

        queryClient.invalidateQueries({
          queryKey: messageKeys.list(conversationId),
        });

        // Increment unread count for conversation
        queryClient.setQueryData(
          messageKeys.unreadCount(conversationId),
          (prev: number) => (prev || 0) + 1,
        );
      },
    )
    .on(
      'broadcast',
      {
        event: 'message:updated',
      },
      (payload) => {
        logger.debug(
          'Received message updated broadcast',
          JSON.stringify(payload),
        );

        queryClient.invalidateQueries({
          queryKey: messageKeys.list(conversationId),
        });
      },
    )
    .on(
      'broadcast',
      {
        event: 'message:deleted',
      },
      (payload) => {
        logger.debug(
          'Received message deleted broadcast',
          JSON.stringify(payload),
        );

        queryClient.invalidateQueries({
          queryKey: messageKeys.list(conversationId),
        });

        // Decrement unread count for conversation
        queryClient.setQueryData(
          messageKeys.unreadCount(conversationId),
          (prev: number) => (prev || 0) - 1,
        );
      },
    );

  return channel;
}
