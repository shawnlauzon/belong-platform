import { useState, useEffect } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { fetchMessages } from '../api';
import { Message } from '../types';
import { MessageWithSender } from '../types/messageRow';
import { transformMessage } from '../transformers';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseMessagesResult {
  data: Message[];
  isLoading: boolean;
}

export function useMessages(conversationId: string): UseMessagesResult {
  const client = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!client || !conversationId) return;

    let channel: RealtimeChannel;
    let userId: string;

    const setupRealtimeMessaging = async () => {
      try {
        // Get current user
        const { data: userData } = await client.auth.getUser();
        if (!userData?.user) {
          setIsLoading(false);
          return;
        }
        userId = userData.user.id;

        // Load initial messages (load all messages, no pagination)
        const initialData = await fetchMessages(client, { 
          conversationId, 
          limit: 1000  // Large limit to get all messages
        });
        
        setMessages(initialData.messages);

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
                
                // Add new message to the beginning of the list (newest first)
                setMessages(prev => [newMessage, ...prev]);
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
                
                // Update the message in place
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === updatedMessage.id ? updatedMessage : msg
                  )
                );
              }
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Failed to setup realtime messaging:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupRealtimeMessaging();

    return () => {
      if (channel) {
        client.removeChannel(channel);
      }
    };
  }, [client, conversationId]);

  return {
    data: messages,
    isLoading,
  };
}