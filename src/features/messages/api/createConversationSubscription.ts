import type { QueryClient } from '@tanstack/react-query';
import type {
  SupabaseClient,
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { conversationKeys, messageKeys } from '../queries';
import { toDomainMessage } from '../transformers';
import type { Message } from '../types';
import { logger } from '@/shared';
import { ConversationRow, MessageRow } from '../types/messageRow';

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
}

export interface MessageSubscriptionResult {
  conversationChannel: RealtimeChannel;
  messageChannel: RealtimeChannel;
  cleanup: () => Promise<void>;
}

/**
 * Creates real-time message subscriptions for a user.
 * This function extracts the core subscription logic from MessageRealtimeProvider
 * to make it testable without React context.
 *
 * @param dependencies - The required dependencies for creating the subscription
 * @returns Promise that resolves to subscription result with cleanup function
 */
export async function createConversationSubscription({
  supabase,
  queryClient,
  userId,
}: CreateMessageSubscriptionParams): Promise<MessageSubscriptionResult> {
  // Subscribe to conversation updates (for last message, unread counts, etc.)
  const conversationChannel = supabase
    .channel(`messages:${userId}`)
    .on<ConversationRow>(
      'broadcast',
      {
        event: '*',
      },
      (payload) => {
        logger.debug('Received broadcast', JSON.stringify(payload));
      },
      // (payload: RealtimeBroadcastPayload<ConversationRow>) => {
      //   if (payload.errors) {
      //     logger.error('Error in INSERT conversations channel', payload.errors);
      //     return;
      //   }
      //   logger.debug('Received new conversation', payload.new);

      //   const conversationType = (payload.new as ConversationRow)
      //     .conversation_type;

      //   // Just invalidate the list of conversations to trigger refetch
      //   queryClient.invalidateQueries({
      //     queryKey: conversationKeys.list({ conversationType }),
      //   });
      // },
    )
    .subscribe();

  const cleanup = async () => {
    // Cleanup all channels
    supabase.removeChannel(conversationChannel);
  };

  return {
    conversationChannel,
    cleanup,
  };
}
