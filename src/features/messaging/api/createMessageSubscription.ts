import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import {
  messagesChannelForCommunity,
  messagesChannelForConversation,
} from '../utils';
import { communityChatKeys, conversationKeys } from '../queries';
import type { Database } from '@/shared/types/database';

// Simple types for diagnostic version
interface Message {
  id: string;
  conversationId?: string;
  communityId?: string;
  senderId: string;
  content: string;
  isEdited: boolean;
  isDeleted: boolean;
  encryptionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RealtimeBroadcastEvent {
  event: string;
  payload: {
    message_id: string;
    sender_id: string;
    content: string;
    sent_at: string;
  };
}

export interface CreateMessageSubscriptionParams {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  conversationId?: string;
  communityId?: string;
  onStatusChange?: (status: string, isConnecting: boolean) => void;
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
  onStatusChange,
}: CreateMessageSubscriptionParams): Promise<RealtimeChannel> {
  // Validate: exactly one must be provided
  if ((!conversationId && !communityId) || (conversationId && communityId)) {
    throw new Error('Provide either conversationId or communityId, not both');
  }

  if (!supabase || !queryClient) {
    throw new Error('Supabase client or query client not available');
  }

  const channelName = conversationId
    ? messagesChannelForConversation(conversationId)
    : messagesChannelForCommunity(communityId!);

  logger.info('=== CREATING MESSAGE SUBSCRIPTION ===', channelName);

  // Check current auth state
  await supabase.auth.getSession();

  try {
    await supabase.realtime.setAuth();
  } catch (authError) {
    logger.error('❌ Failed to set realtime auth:', authError);
    throw authError;
  }

  const channel = supabase
    .channel(channelName, {
      config: {
        private: true,
        broadcast: {
          ack: false,
          self: false,
        },
      },
    })
    .on('broadcast', { event: '*' }, async (event: RealtimeBroadcastEvent) => {
      try {
        logger.debug(
          '💬 === BROADCAST MESSAGE RECEIVED ===',
          channelName,
          event,
        );

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
            logger.info('📥 MESSAGE CREATED:', message);
            handleCreateReceived(message);
            break;
          case 'message.updated':
            logger.info('✏️ MESSAGE UPDATED:', message);
            handleUpdateReceived(message);
            break;
          case 'message.deleted':
            logger.info('🗑️ MESSAGE DELETED:', message);
            handleDeleteReceived(message);
            break;
          default:
            logger.warn('❓ UNKNOWN MESSAGE EVENT:', event.event, message);
            break;
        }
      } catch (error) {
        logger.error('❌ Error handling message:', {
          error,
          event,
          conversationId,
          communityId,
        });
      }
    });

  // Subscribe and return the channel
  return channel.subscribe((status, err) => {
    const timestamp = new Date().toISOString();
    logger.debug(
      '=== MESSAGE SUBSCRIPTION STATUS ===',
      `[${timestamp}] ${channelName}:`,
      status,
      err ? { error: err, errorMessage: err.message } : 'no error',
    );

    // Enhanced status logging and status change callback
    switch (status) {
      case 'SUBSCRIBED':
        logger.info('🟢 Channel successfully subscribed');
        if (onStatusChange) {
          // Add a small delay to ensure subscription is fully established
          setTimeout(() => onStatusChange(status, false), 50);
        }
        break;
      case 'CHANNEL_ERROR':
        logger.error('🔴 Channel error occurred:', { error: err, timestamp });
        if (onStatusChange) {
          setTimeout(() => onStatusChange(status, false), 100);
        }
        break;
      case 'TIMED_OUT':
        logger.warn('⏰ Channel timed out:', { error: err, timestamp });
        if (onStatusChange) {
          setTimeout(() => onStatusChange(status, false), 100);
        }
        break;
      case 'CLOSED':
        logger.warn('🚪 Channel closed:', { error: err, timestamp });
        if (onStatusChange) {
          setTimeout(() => onStatusChange(status, false), 100);
        }
        break;
    }
  });

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

    // Invalidate conversations list to update last message
    if (conversationId) {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(),
      });
    } else if (communityId) {
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.list(),
      });
    }
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

    // Invalidate conversations list to update last message if edited
    if (message.conversationId) {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(),
      });
    } else if (message.communityId) {
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.list(),
      });
    }
  }

  function handleDeleteReceived(message: Message) {
    logger.debug('Handling message deleted', { messageId: message.id });

    queryClient.setQueryData<Message[]>(
      message.conversationId
        ? conversationKeys.messages(message.conversationId)
        : communityChatKeys.messages(message.communityId!),
      (prev: Message[] | undefined) => prev?.filter((m) => m.id !== message.id),
    );

    // Invalidate conversations list to update last message if deleted
    if (message.conversationId) {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(),
      });
    } else if (message.communityId) {
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.list(),
      });
    }
  }
}
