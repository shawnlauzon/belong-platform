import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { messageKeys } from '../queries';
import { Message } from '../types';
import { MessageWithSender } from '../types/messageRow';
import { transformMessage } from '../transformers';
import { RealtimeChannel } from '@supabase/supabase-js';

interface MessagesQueryData {
  pages: Array<{
    messages: Message[];
    hasMore: boolean;
    cursor?: string;
  }>;
  pageParams: unknown[];
}

export function useRealtimeMessages(conversationId: string | null) {
  const client = useSupabase();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client || !conversationId) return;

    let channel: RealtimeChannel;

    const setupRealtimeSubscription = async () => {
      const { data: userData } = await client.auth.getUser();
      if (!userData?.user) return;

      const userId = userData.user.id;

      // Subscribe to new messages in this conversation
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
            // Fetch the full message with sender info
            const { data } = await client
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const newMessage = transformMessage(data as MessageWithSender, userId);
              
              // Update messages cache
              queryClient.setQueryData<MessagesQueryData>(
                messageKeys.messages(conversationId),
                (oldData) => {
                  if (!oldData) return oldData;
                  
                  const pages = [...oldData.pages];
                  const lastPage = pages[pages.length - 1];
                  
                  return {
                    ...oldData,
                    pages: [
                      ...pages.slice(0, -1),
                      {
                        ...lastPage,
                        messages: [...lastPage.messages, newMessage],
                      },
                    ],
                  };
                }
              );

              // Invalidate conversation to update last message
              queryClient.invalidateQueries({
                queryKey: messageKeys.conversation(conversationId),
              });

              // Invalidate conversations list to update last message
              queryClient.invalidateQueries({
                queryKey: messageKeys.conversations(),
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
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            // Handle message edits/deletions
            const { data } = await client
              .from('messages')
              .select(`
                *,
                sender:profiles!messages_sender_id_fkey(*)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              const updatedMessage = transformMessage(data as MessageWithSender, userId);
              
              // Update messages cache
              queryClient.setQueryData<MessagesQueryData>(
                messageKeys.messages(conversationId),
                (oldData) => {
                  if (!oldData) return oldData;
                  
                  return {
                    ...oldData,
                    pages: oldData.pages.map((page) => ({
                      ...page,
                      messages: page.messages.map((msg) =>
                        msg.id === updatedMessage.id ? updatedMessage : msg
                      ),
                    })),
                  };
                }
              );
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, [client, conversationId, queryClient]);
}