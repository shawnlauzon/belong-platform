import { useState, useEffect } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { fetchMessages } from '../api';
import { Message } from '../types';
import { transformMessage } from '../transformers';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useConversation } from './useConversation';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser';
import { logger } from '../../../shared';

interface UseMessagesResult {
  data: Message[];
  isLoading: boolean;
}

export function useMessages(conversationId: string): UseMessagesResult {
  const client = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const { data: conversation, isLoading: isConversationLoading } =
    useConversation(conversationId);
  const { data: currentUser, isLoading: isCurrentUserLoading } =
    useCurrentUser();

  useEffect(() => {
    if (
      !client ||
      isConversationLoading ||
      !conversation ||
      isCurrentUserLoading ||
      !currentUser
    ) {
      logger.debug('useMessages: waiting for dependencies', {
        hasClient: !!client,
        hasConversationId: !!conversationId,
        isConversationLoading,
        hasConversation: !!conversation,
        isCurrentUserLoading,
        hasCurrentUser: !!currentUser,
      });
      return;
    }

    logger.info('useMessages: initializing message subscription', {
      conversationId,
      userId: currentUser.id,
      otherParticipantId: conversation.otherParticipant?.id,
    });

    let channel: RealtimeChannel;
    let userId: string;

    const setupRealtimeMessaging = async () => {
      try {
        userId = currentUser.id;

        logger.debug('useMessages: loading initial messages', {
          conversationId,
          userId,
          requestLimit: 1000,
        });

        // Load initial messages (load all messages, no pagination)
        const initialData = await fetchMessages(client, {
          conversationId,
          limit: 1000, // Large limit to get all messages
        });

        logger.info('useMessages: initial messages loaded', {
          conversationId,
          messageCount: initialData.messages.length,
          hasMore: initialData.hasMore,
        });

        // Transform messages with participant data
        const transformedMessages = initialData.messages.map((msg) => {
          const message = transformMessage(
            msg,
            userId,
            currentUser,
            conversation.otherParticipant,
          );
          message.conversationId = conversationId;
          return message;
        });

        setMessages(transformedMessages);

        logger.debug('useMessages: setting up realtime subscription', {
          conversationId,
          channelName: `conversation:${conversationId}`,
        });

        // Set up realtime subscription
        channel = client
          .channel(`conversation:${conversationId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'messages',
              filter: `conversation_id=eq.${conversationId}`,
            },
            async (payload) => {
              logger.info('useMessages: received new message via realtime', {
                conversationId,
                messageId: payload.new.id,
                senderId: payload.new.sender_id,
              });

              // Fetch the message without profile data
              const { data } = await client
                .from('messages')
                .select('id, sender_id, content, created_at, updated_at')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const newMessage = transformMessage(
                  data,
                  userId,
                  currentUser,
                  conversation.otherParticipant,
                );
                newMessage.conversationId = conversationId;

                logger.debug('useMessages: adding new message to state', {
                  messageId: newMessage.id,
                  senderId: newMessage.senderId,
                  conversationId,
                });

                // Add new message to the end of the list (chronological order)
                setMessages((prev) => [...prev, newMessage]);
              } else {
                logger.warn('useMessages: failed to fetch new message data', {
                  messageId: payload.new.id,
                  conversationId,
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
              filter: `conversation_id=eq.${conversationId}`,
            },
            async (payload) => {
              logger.info('useMessages: received message update via realtime', {
                conversationId,
                messageId: payload.new.id,
                senderId: payload.new.sender_id,
              });

              // Handle message edits/deletions
              const { data } = await client
                .from('messages')
                .select('id, sender_id, content, created_at, updated_at')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const updatedMessage = transformMessage(
                  data,
                  userId,
                  currentUser,
                  conversation.otherParticipant,
                );
                updatedMessage.conversationId = conversationId;

                logger.debug('useMessages: updating message in state', {
                  messageId: updatedMessage.id,
                  conversationId,
                });

                // Update the message in place
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === updatedMessage.id ? updatedMessage : msg,
                  ),
                );
              } else {
                logger.warn(
                  'useMessages: failed to fetch updated message data',
                  {
                    messageId: payload.new.id,
                    conversationId,
                  },
                );
              }
            },
          )
          .subscribe();

        logger.info(
          'useMessages: realtime subscription established successfully',
          {
            conversationId,
            initialMessageCount: transformedMessages.length,
          },
        );
      } catch (error) {
        logger.error('useMessages: failed to setup realtime messaging', {
          error,
          conversationId,
          userId: currentUser?.id,
        });
      }
    };

    setupRealtimeMessaging();

    return () => {
      if (channel) {
        logger.debug('useMessages: cleaning up realtime subscription', {
          conversationId,
          channelName: `conversation:${conversationId}`,
        });
        client.removeChannel(channel);
      }
    };
  }, [
    client,
    conversationId,
    conversation,
    isConversationLoading,
    currentUser,
    isCurrentUserLoading,
  ]);

  return {
    data: messages,
    isLoading: isConversationLoading || isCurrentUserLoading,
  };
}
