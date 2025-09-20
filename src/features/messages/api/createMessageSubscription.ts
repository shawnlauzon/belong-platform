import type { QueryClient } from '@tanstack/react-query';
import type {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { messageKeys } from '../queries';
import { logger } from '@/shared';
import { MessageRow } from '../types/messageRow';
import { toDomainMessage } from '../transformers';
import { Message } from '../types';

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  conversationId: string;
}

interface RealtimeBroadcastMessage {
  event: string;
  payload: MessageRow;
  type: string;
}

/**
 * Creates a subscription for new messages in a given conversation.
 */
export async function createMessageSubscription({
  supabase,
  queryClient,
  conversationId,
}: CreateMessageSubscriptionParams): Promise<RealtimeChannel> {
  logger.info('=== CREATING MESSAGE SUBSCRIPTION ===', {
    conversationId,
    channelName: `conversation:${conversationId}:messages`,
  });

  await supabase.realtime.setAuth();
  return supabase
    .channel(`conversation:${conversationId}:messages`, {
      config: { private: true },
    })
    .on(
      'broadcast',
      { event: '*' },
      async (message: RealtimeBroadcastMessage) => {
        try {
          logger.debug('💬 === BROADCAST MESSAGE RECEIVED ===', {
            message,
            conversationId,
          });

          switch (message.event) {
            case 'created':
              handleMessageCreated(message.payload);
              break;
            case 'updated':
              handleMessageUpdated(message.payload);
              break;
            case 'deleted':
              handleMessageDeleted(message.payload);
              break;
            default:
              break;
          }
        } catch (error) {
          logger.error('createMessageSubscription: error processing message', {
            error,
            message,
            conversationId,
          });
        }
      },
    )
    .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
      logger.info('=== MESSAGE SUBSCRIPTION STATUS CHANGE ===', {
        status,
        conversationId,
      });
      if (err) {
        logger.error('=== MESSAGE SUBSCRIPTION ERROR ===', {
          error: err,
          conversationId,
        });
        throw err;
      }
    });

  function handleMessageCreated(messageRow: MessageRow) {
    logger.debug('Handling message created', { messageId: messageRow.id });

    const message = toDomainMessage(messageRow);

    queryClient.setQueryData<Message[]>(
      messageKeys.list(conversationId),
      (prev: Message[] | undefined) => [...(prev || []), message],
    );

    // Increment unread count for conversation
    queryClient.setQueryData(
      messageKeys.unreadCount(conversationId),
      (prev: number | undefined) => (prev || 0) + 1,
    );

    // Increment total unread count
    queryClient.setQueryData(
      messageKeys.totalUnreadCount(),
      (prev: number | undefined) => (prev || 0) + 1,
    );
  }

  function handleMessageUpdated(messageRow: MessageRow) {
    logger.debug('Handling message updated', { messageId: messageRow.id });

    const message = toDomainMessage(messageRow);

    queryClient.setQueryData<Message[]>(
      messageKeys.list(conversationId),
      (prev: Message[] | undefined) =>
        prev?.map((m) => (m.id === message.id ? message : m)),
    );
  }

  function handleMessageDeleted(messageRow: MessageRow) {
    logger.debug('Handling message deleted', { messageId: messageRow.id });

    const message = toDomainMessage(messageRow);

    queryClient.setQueryData<Message[]>(
      messageKeys.list(conversationId),
      (prev: Message[] | undefined) => prev?.filter((m) => m.id !== message.id),
    );
  }
}
