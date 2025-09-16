import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { messageKeys } from '../queries';
import { logger } from '@/shared';

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  conversationId: string;
}

/**
 * Creates real-time message subscriptions for a user.
 * This function extracts the core subscription logic from MessageRealtimeProvider
 * to make it testable without React context.
 *
 * @param dependencies - The required dependencies for creating the subscription
 * @returns Promise that resolves to subscription result with cleanup function
 */
export async function createMessageSubscription({
  supabase,
  queryClient,
  conversationId,
}: CreateMessageSubscriptionParams): Promise<RealtimeChannel> {
  // Subscribe to new messages across given conversation
  const messageChannel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'broadcast',
      {
        event: '*',
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
    .subscribe();

  logger.debug(
    'Subscribed to message channel',
    `conversation:${conversationId}`,
  );

  return messageChannel;
}
