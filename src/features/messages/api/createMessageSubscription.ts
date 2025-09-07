import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { messageKeys } from '../queries';
import { transformMessage } from '../transformers';
import type { Message, Conversation } from '../types';
import type { CurrentUser } from '@/features/users/types';

// Type for Supabase postgres_changes payload
interface PostgresChangesPayload {
  new: Record<string, unknown> & {
    id?: string;
    conversation_id?: string;
    sender_id?: string;
    content?: string;
    created_at?: string;
  };
  old?: Record<string, unknown>;
  eventType: string;
  schema: string;
  table: string;
  commit_timestamp: string;
  errors?: unknown;
}

export interface CreateMessageSubscriptionDependencies {
  supabase: SupabaseClient<Database>;
  queryClient: QueryClient;
  userId: string;
  currentUser: CurrentUser;
  logger: typeof import('@/shared').logger;
}

export interface MessageSubscriptionResult {
  channels: Map<string, RealtimeChannel>;
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
export async function createMessageSubscription(
  dependencies: CreateMessageSubscriptionDependencies,
): Promise<MessageSubscriptionResult> {
  const { supabase, queryClient, userId, currentUser, logger } = dependencies;
  const channels = new Map<string, RealtimeChannel>();

  logger.info('createMessageSubscription: initializing subscriptions', {
    userId,
  });

  // Subscribe to conversation updates (for last message, unread counts, etc.)
  const conversationChannel = supabase
    .channel('user-conversations')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      },
      (payload: PostgresChangesPayload) => {
        logger.debug('createMessageSubscription: conversation updated', {
          conversationId: payload.new.id,
          userId,
        });

        // Update conversation in list cache
        queryClient.setQueryData(
          messageKeys.conversationList(),
          (oldData: Conversation[] | undefined) => {
            if (!oldData) return oldData;
            return oldData.map((conv) =>
              conv.id === payload.new.id ? { ...conv, ...payload.new } : conv,
            );
          },
        );

        // Invalidate counts to trigger refetch
        queryClient.invalidateQueries({
          queryKey: messageKeys.unreadCount(),
        });
      },
    )
    .subscribe();

  channels.set('conversations', conversationChannel);

  // Subscribe to new messages across all conversations
  const messageChannel = supabase
    .channel('conversation-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      async (payload: PostgresChangesPayload) => {
        const conversationId = payload.new.conversation_id as string;

        if (!conversationId || !payload.new.id || !payload.new.sender_id) {
          logger.warn(
            'createMessageSubscription: received incomplete message payload',
            {
              payload,
              userId,
            },
          );
          return;
        }

        logger.debug('createMessageSubscription: new message received', {
          messageId: payload.new.id,
          conversationId,
          senderId: payload.new.sender_id,
          userId,
        });

        // Fetch sender profile for the message
        const { data: senderProfile } = await supabase
          .from('public_profiles')
          .select('id, first_name, last_name, full_name, avatar_url')
          .eq('id', payload.new.sender_id as string)
          .single();

        if (senderProfile && senderProfile.id) {
          const messageData = {
            id: payload.new.id as string,
            sender_id: payload.new.sender_id as string,
            content: payload.new.content as string,
            created_at: payload.new.created_at as string,
            updated_at: payload.new.updated_at as string,
          };

          // Convert profile to UserSummary format
          const senderSummary = {
            id: senderProfile.id,
            firstName: senderProfile.first_name || '',
            lastName: senderProfile.last_name || undefined,
            fullName: senderProfile.full_name || undefined,
            avatarUrl: senderProfile.avatar_url || undefined,
          };

          const newMessage = transformMessage(
            messageData,
            userId,
            currentUser,
            payload.new.sender_id === userId ? senderSummary : senderSummary,
          );
          newMessage.conversationId = conversationId;

          // Update messages cache for this conversation
          queryClient.setQueryData(
            messageKeys.list(conversationId),
            (oldData: Message[] | undefined) => {
              if (!oldData) return [newMessage];
              // Check if message already exists to avoid duplicates
              if (oldData.some((msg) => msg.id === newMessage.id)) {
                return oldData;
              }
              return [...oldData, newMessage];
            },
          );

          // Update conversation list to reorder and show latest message
          queryClient.setQueryData(
            messageKeys.conversationList(),
            (oldData: Conversation[] | undefined) => {
              if (!oldData) return oldData;

              const existingConversation = oldData.find(
                (c) => c.id === conversationId,
              );
              if (existingConversation) {
                // Move conversation to top with updated last message
                const updated = oldData.filter((c) => c.id !== conversationId);
                return [
                  {
                    ...existingConversation,
                    lastMessageAt: new Date(payload.new.created_at as string),
                    lastMessagePreview: (
                      payload.new.content as string
                    ).substring(0, 100),
                    lastMessageSenderId: payload.new.sender_id as string,
                  },
                  ...updated,
                ];
              }

              // If conversation not found, invalidate to refetch
              queryClient.invalidateQueries({
                queryKey: messageKeys.conversationList(),
              });
              return oldData;
            },
          );

          // Invalidate counts to trigger refetch
          queryClient.invalidateQueries({
            queryKey: messageKeys.unreadCount(),
          });
        }
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
      },
      async (payload: PostgresChangesPayload) => {
        const conversationId = payload.new.conversation_id as string;

        if (!conversationId || !payload.new.id || !payload.new.sender_id) {
          logger.warn(
            'createMessageSubscription: received incomplete message update payload',
            {
              payload,
              userId,
            },
          );
          return;
        }

        logger.debug('createMessageSubscription: message updated', {
          messageId: payload.new.id,
          conversationId,
          userId,
        });

        // Fetch sender profile for the updated message
        const { data: senderProfile } = await supabase
          .from('public_profiles')
          .select('id, first_name, last_name, full_name, avatar_url')
          .eq('id', payload.new.sender_id as string)
          .single();

        if (senderProfile && senderProfile.id) {
          const messageData = {
            id: payload.new.id as string,
            sender_id: payload.new.sender_id as string,
            content: payload.new.content as string,
            created_at: payload.new.created_at as string,
            updated_at: payload.new.updated_at as string,
          };

          // Convert profile to UserSummary format
          const senderSummary = {
            id: senderProfile.id,
            firstName: senderProfile.first_name || '',
            lastName: senderProfile.last_name || undefined,
            fullName: senderProfile.full_name || undefined,
            avatarUrl: senderProfile.avatar_url || undefined,
          };

          const updatedMessage = transformMessage(
            messageData,
            userId,
            currentUser,
            payload.new.sender_id === userId ? senderSummary : senderSummary,
          );
          updatedMessage.conversationId = conversationId;

          // Update message in cache
          queryClient.setQueryData(
            messageKeys.list(conversationId),
            (oldData: Message[] | undefined) => {
              if (!oldData) return oldData;
              return oldData.map((msg) =>
                msg.id === updatedMessage.id ? updatedMessage : msg,
              );
            },
          );
        }
      },
    )
    .subscribe();

  channels.set('messages', messageChannel);

  logger.info('createMessageSubscription: subscriptions established', {
    userId,
    channelCount: channels.size,
  });

  const cleanup = async () => {
    // Cleanup all channels
    channels.forEach((channel, name) => {
      logger.debug('createMessageSubscription: cleaning up channel', {
        channelName: name,
        userId,
      });
      supabase.removeChannel(channel);
    });
    channels.clear();
  };

  return {
    channels,
    cleanup,
  };
}
