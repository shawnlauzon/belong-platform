import type { QueryClient } from '@tanstack/react-query';
import type {
  SupabaseClient,
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { communityChatKeys, conversationKeys } from '../queries';
import { logger } from '@/shared';
import {
  Message,
  RealtimeBroadcastMessage as RealtimeBroadcastEvent,
} from '../types';
import {
  messagesChannelForConversation,
  messagesChannelForCommunity,
} from '../utils';

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  conversationId?: string;
  communityId?: string;
}

/**
 * Creates a subscription for new messages in a given conversation.
 *
 * Messages are sent manually via the sendMessage function,
 * as opposed to notifications which are sent by supabase
 */
export async function createMessageSubscription({
  supabase,
  queryClient,
  conversationId,
  communityId,
}: CreateMessageSubscriptionParams): Promise<RealtimeChannel> {
  // Validate: exactly one must be provided
  if ((!conversationId && !communityId) || (conversationId && communityId)) {
    throw new Error('Provide either conversationId or communityId, not both');
  }

  const channelName = conversationId
    ? messagesChannelForConversation(conversationId)
    : messagesChannelForCommunity(communityId!);

  const isUserChannel = !!conversationId;

  logger.info('=== CREATING MESSAGE SUBSCRIPTION ===', {
    conversationId,
    communityId,
    channelName,
    isUserChannel,
  });

  await supabase.realtime.setAuth();
  const channel = supabase
    .channel(channelName, {
      config: { private: true },
    })
    .on('broadcast', { event: '*' }, async (event: RealtimeBroadcastEvent) => {
      try {
        logger.debug('💬 === BROADCAST MESSAGE RECEIVED ===', {
          channelName,
          event,
          conversationId,
          communityId,
        });

        const message: Message = {
          id: event.payload.message_id,
          conversationId,
          communityId,
          senderId: event.payload.sender_id,
          content: event.payload.content,
          isEdited: event.event === 'message.updated',
          isDeleted: event.event === 'message.deleted',
          encryptionVersion: 1,
          createdAt: new Date(event.payload.sent_at),
          updatedAt: new Date(event.payload.sent_at),
        };

        switch (event.event) {
          case 'message.created':
            handleCreateReceived(message);
            break;
          case 'message.updated':
            handleUpdateReceived(message);
            break;
          case 'message.deleted':
            handleDeleteReceived(message);
            break;
          default:
            break;
        }
      } catch (error) {
        logger.error('createMessageSubscription: error processing message', {
          error,
          event,
          conversationId,
          communityId,
        });
      }
    })
    .subscribe((status: REALTIME_SUBSCRIBE_STATES, err?: Error) => {
      logger.info('=== MESSAGE SUBSCRIPTION STATUS CHANGE ===', {
        channelName,
        status,
        conversationId,
        communityId,
      });
      if (err) {
        logger.error('=== MESSAGE SUBSCRIPTION ERROR ===', {
          channelName,
          error: err,
          conversationId,
          communityId,
        });
        throw err;
      }
    });

  return channel;

  function handleCreateReceived(message: Message) {
    logger.debug('Handling message created', message);

    queryClient.setQueryData<Message[]>(
      conversationId
        ? conversationKeys.messages(conversationId)
        : communityChatKeys.messages(communityId!),
      (prev: Message[] | undefined) => [...(prev || []), message],
    );

    // Increment unread count for conversation
    queryClient.setQueryData(
      conversationId
        ? conversationKeys.unreadCount(conversationId)
        : communityChatKeys.unreadCount(communityId!),
      (prev: number | undefined) => (prev || 0) + 1,
    );

    // Increment total unread count
    queryClient.setQueryData(
      conversationId
        ? conversationKeys.totalUnreadCount()
        : communityChatKeys.totalUnreadCount(),
      (prev: number | undefined) => (prev || 0) + 1,
    );
  }

  function handleUpdateReceived(message: Message) {
    logger.debug('Handling message updated', { messageId: message.id });

    queryClient.setQueryData<Message[]>(
      message.conversationId
        ? conversationKeys.messages(message.conversationId)
        : communityChatKeys.messages(message.communityId!),
      (prev: Message[] | undefined) =>
        prev?.map((m) => (m.id === message.id ? message : m)),
    );
  }

  function handleDeleteReceived(message: Message) {
    logger.debug('Handling message deleted', { messageId: message.id });

    queryClient.setQueryData<Message[]>(
      message.conversationId
        ? conversationKeys.messages(message.conversationId)
        : communityChatKeys.messages(message.communityId!),
      (prev: Message[] | undefined) => prev?.filter((m) => m.id !== message.id),
    );
  }
}
