import { useState, useEffect } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { fetchMessages } from '../api';
import { Message } from '../types';
import { transformMessage } from '../transformers';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useConversation } from './useConversation';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser';

interface UseMessagesResult {
  data: Message[];
  isLoading: boolean;
}

export function useMessages(conversationId: string): UseMessagesResult {
  const client = useSupabase();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: conversation, isLoading: isConversationLoading } = useConversation(conversationId);
  const { data: currentUser, isLoading: isCurrentUserLoading } = useCurrentUser();

  useEffect(() => {
    if (!client || !conversationId || isConversationLoading || !conversation || isCurrentUserLoading || !currentUser) return;

    let channel: RealtimeChannel;
    let userId: string;

    const setupRealtimeMessaging = async () => {
      try {
        userId = currentUser.id;

        // Load initial messages (load all messages, no pagination)
        const initialData = await fetchMessages(client, { 
          conversationId, 
          limit: 1000  // Large limit to get all messages
        });
        
        // Transform messages with participant data
        const transformedMessages = initialData.messages.map(msg => {
          const message = transformMessage(msg, userId, currentUser, conversation.otherParticipant);
          message.conversationId = conversationId;
          return message;
        });
        
        setMessages(transformedMessages);

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
                  conversation.otherParticipant
                );
                newMessage.conversationId = conversationId;
                
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
                .select('id, sender_id, content, created_at, updated_at')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const updatedMessage = transformMessage(
                  data, 
                  userId, 
                  currentUser, 
                  conversation.otherParticipant
                );
                updatedMessage.conversationId = conversationId;
                
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
  }, [client, conversationId, conversation, isConversationLoading, currentUser, isCurrentUserLoading]);

  return {
    data: messages,
    isLoading: isLoading || isConversationLoading || isCurrentUserLoading,
  };
}