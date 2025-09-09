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
export async function createMessageSubscription({
  supabase,
  queryClient,
}: CreateMessageSubscriptionParams): Promise<MessageSubscriptionResult> {
  // Subscribe to conversation updates (for last message, unread counts, etc.)
  const conversationChannel = supabase
    .channel('conversations')
    .on<ConversationRow>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'conversations',
      },
      (payload: RealtimePostgresChangesPayload<ConversationRow>) => {
        if (payload.errors) {
          logger.error('Error in INSERT conversations channel', payload.errors);
          return;
        }
        logger.debug('Received new conversation', payload.new);

        const conversationType = (payload.new as ConversationRow)
          .conversation_type;

        // Just invalidate the list of conversations to trigger refetch
        queryClient.invalidateQueries({
          queryKey: conversationKeys.list({ conversationType }),
        });
      },
    )
    .subscribe();

  // Subscribe to new messages across all conversations
  const messageChannel = supabase
    .channel('user-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        if (payload.errors) {
          logger.error('Error in INSERT messages channel', payload.errors);
          return;
        }

        if (!(payload.new as MessageRow).id) {
          logger.info('Received message without ID', {
            payload,
          });
          return;
        }

        const messageRow = payload.new as MessageRow;
        logger.debug('Received new message', {
          messageRow,
        });

        const newMessage = toDomainMessage(messageRow);

        const currentMessages =
          queryClient.getQueryData<Message[]>(
            messageKeys.list(messageRow.conversation_id),
          ) || [];

        // Add new message to conversation list
        queryClient.setQueryData(messageKeys.list(messageRow.conversation_id), [
          ...currentMessages,
          newMessage,
        ]);

        // Increment unread count for conversation
        queryClient.setQueryData(
          messageKeys.unreadCount(messageRow.conversation_id),
          (queryClient.getQueryData<number>(
            messageKeys.unreadCount(messageRow.conversation_id),
          ) || 0) + 1,
        );
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      (payload: RealtimePostgresChangesPayload<MessageRow>) => {
        if (payload.errors) {
          logger.error('Error in UPDATE messages channel', payload.errors);
          return;
        }
        const messageRow = payload.new as MessageRow;
        logger.debug('Received updated message', {
          messageRow,
        });

        const newMessage = toDomainMessage(messageRow);

        const currentMessages =
          queryClient.getQueryData<Message[]>(
            messageKeys.list(messageRow.conversation_id),
          ) || [];

        const updatedMessages = currentMessages.map((message) => {
          if (message.id === messageRow.id) {
            return newMessage;
          }
          return message;
        });

        // Add new message to conversation list
        queryClient.setQueryData(messageKeys.list(messageRow.conversation_id), [
          ...updatedMessages,
        ]);
      },
    )
    .subscribe();

  const cleanup = async () => {
    // Cleanup all channels
    supabase.removeChannel(messageChannel);
    supabase.removeChannel(conversationChannel);
  };

  return {
    messageChannel,
    conversationChannel,
    cleanup,
  };
}
