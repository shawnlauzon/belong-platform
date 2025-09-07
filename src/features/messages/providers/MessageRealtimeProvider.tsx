import { useEffect, PropsWithChildren, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { messageKeys } from '../queries';
import { transformMessage } from '../transformers';
import type { Message, Conversation } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Provider that manages real-time message subscriptions.
 * Updates React Query cache when new messages arrive or conversations update.
 * 
 * This should be placed near the root of your app to ensure
 * messages are received globally.
 */
export function MessageRealtimeProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const userId = currentUser.id;

    const setupRealtimeMessaging = async () => {
      try {
        logger.info('MessageRealtimeProvider: initializing subscriptions', { userId });

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
            (payload) => {
              logger.debug('MessageRealtimeProvider: conversation updated', {
                conversationId: payload.new.id,
                userId,
              });

              // Update conversation in list cache
              queryClient.setQueryData(
                messageKeys.conversationList(),
                (oldData: Conversation[] | undefined) => {
                  if (!oldData) return oldData;
                  return oldData.map(conv =>
                    conv.id === payload.new.id
                      ? { ...conv, ...payload.new }
                      : conv
                  );
                }
              );

              // Invalidate counts to trigger refetch
              queryClient.invalidateQueries({
                queryKey: ['unreadCounts'],
              });
            }
          )
          .subscribe();

        channelsRef.current.set('conversations', conversationChannel);

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
            async (payload) => {
              const conversationId = payload.new.conversation_id;
              
              logger.debug('MessageRealtimeProvider: new message received', {
                messageId: payload.new.id,
                conversationId,
                senderId: payload.new.sender_id,
                userId,
              });

              // Fetch sender profile for the message
              const { data: senderProfile } = await supabase
                .from('public_profiles')
                .select('id, first_name, last_name, full_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();

              if (senderProfile && senderProfile.id) {
                const messageData = {
                  id: payload.new.id,
                  sender_id: payload.new.sender_id,
                  content: payload.new.content,
                  created_at: payload.new.created_at,
                  updated_at: payload.new.updated_at,
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
                  payload.new.sender_id === userId ? senderSummary : senderSummary
                );
                newMessage.conversationId = conversationId;

                // Update messages cache for this conversation
                queryClient.setQueryData(
                  messageKeys.list(conversationId),
                  (oldData: Message[] | undefined) => {
                    if (!oldData) return [newMessage];
                    // Check if message already exists to avoid duplicates
                    if (oldData.some(msg => msg.id === newMessage.id)) {
                      return oldData;
                    }
                    return [...oldData, newMessage];
                  }
                );

                // Update conversation list to reorder and show latest message
                queryClient.setQueryData(
                  messageKeys.conversationList(),
                  (oldData: Conversation[] | undefined) => {
                    if (!oldData) return oldData;
                    
                    const existingConversation = oldData.find(c => c.id === conversationId);
                    if (existingConversation) {
                      // Move conversation to top with updated last message
                      const updated = oldData.filter(c => c.id !== conversationId);
                      return [{
                        ...existingConversation,
                        lastMessageAt: new Date(payload.new.created_at),
                        lastMessagePreview: payload.new.content.substring(0, 100),
                        lastMessageSenderId: payload.new.sender_id
                      }, ...updated];
                    }
                    
                    // If conversation not found, invalidate to refetch
                    queryClient.invalidateQueries({
                      queryKey: messageKeys.conversationList(),
                    });
                    return oldData;
                  }
                );

                // Invalidate counts to trigger refetch
                queryClient.invalidateQueries({
                  queryKey: ['unreadCounts'],
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'messages',
            },
            async (payload) => {
              const conversationId = payload.new.conversation_id;
              
              logger.debug('MessageRealtimeProvider: message updated', {
                messageId: payload.new.id,
                conversationId,
                userId,
              });

              // Fetch sender profile for the updated message
              const { data: senderProfile } = await supabase
                .from('public_profiles')
                .select('id, first_name, last_name, full_name, avatar_url')
                .eq('id', payload.new.sender_id)
                .single();

              if (senderProfile && senderProfile.id) {
                const messageData = {
                  id: payload.new.id,
                  sender_id: payload.new.sender_id,
                  content: payload.new.content,
                  created_at: payload.new.created_at,
                  updated_at: payload.new.updated_at,
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
                  payload.new.sender_id === userId ? senderSummary : senderSummary
                );
                updatedMessage.conversationId = conversationId;

                // Update message in cache
                queryClient.setQueryData(
                  messageKeys.list(conversationId),
                  (oldData: Message[] | undefined) => {
                    if (!oldData) return oldData;
                    return oldData.map(msg =>
                      msg.id === updatedMessage.id ? updatedMessage : msg
                    );
                  }
                );
              }
            }
          )
          .subscribe();

        channelsRef.current.set('messages', messageChannel);

        logger.info('MessageRealtimeProvider: subscriptions established', { 
          userId,
          channelCount: channelsRef.current.size 
        });
      } catch (error) {
        logger.error('MessageRealtimeProvider: failed to setup messaging', {
          error,
          userId,
        });
      }
    };

    setupRealtimeMessaging();

    return () => {
      // Cleanup all channels
      channelsRef.current.forEach((channel, name) => {
        logger.debug('MessageRealtimeProvider: cleaning up channel', {
          channelName: name,
          userId,
        });
        supabase.removeChannel(channel);
      });
      channelsRef.current.clear();
    };
  }, [supabase, currentUser, queryClient]);

  return <>{children}</>;
}