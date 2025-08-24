import { useState, useEffect } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { fetchConversations } from '../api';
import { ConversationListFilters, Conversation } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseConversationsResult {
  data: Conversation[];
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
}

export function useConversations(filters?: ConversationListFilters): UseConversationsResult {
  const client = useSupabase();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const loadMore = async () => {
    if (!client || isLoadingMore || !hasMore) return;
    
    setIsLoadingMore(true);
    try {
      const result = await fetchConversations(client, filters, 20, cursor);
      setConversations(prev => [...prev, ...result.conversations]);
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (error) {
      console.error('Failed to load more conversations:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!client) return;

    let conversationChannel: RealtimeChannel;
    let messageChannel: RealtimeChannel;

    const setupRealtimeConversations = async () => {
      try {
        // Get current user
        const { data: userData } = await client.auth.getUser();
        if (!userData?.user) {
          setIsLoading(false);
          return;
        }

        // Load initial conversations
        const initialData = await fetchConversations(client, filters, 20);
        setConversations(initialData.conversations);
        setHasMore(initialData.hasMore);
        setCursor(initialData.cursor);

        // Set up realtime subscription for conversation updates
        conversationChannel = client
          .channel('user-conversations')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'conversations',
            },
            (payload) => {
              // Update conversation in the list (for last message updates, etc.)
              setConversations(prev => 
                prev.map(conv => 
                  conv.id === payload.new.id 
                    ? { ...conv, ...payload.new }
                    : conv
                )
              );
            }
          )
          .subscribe();

        // Set up realtime subscription for new messages to update conversation previews
        messageChannel = client
          .channel('conversation-updates')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public', 
              table: 'messages',
            },
            async (payload) => {
              // When a new message is sent, update the conversation's last message info
              const conversationId = payload.new.conversation_id;
              
              setConversations(prev => {
                const existingConversation = prev.find(c => c.id === conversationId);
                
                if (existingConversation) {
                  // Move this conversation to the top and update preview
                  const updated = prev.filter(c => c.id !== conversationId);
                  return [{
                    ...existingConversation,
                    lastMessageAt: new Date(payload.new.created_at),
                    lastMessagePreview: payload.new.content.substring(0, 100),
                    lastMessageSenderId: payload.new.sender_id
                  }, ...updated];
                } else {
                  // Conversation not found - this will trigger a refetch below
                  return prev;
                }
              });
              
              // If this is a new conversation, refetch to get it with full details
              setConversations(prev => {
                const existingConversation = prev.find(c => c.id === conversationId);
                if (!existingConversation) {
                  // Trigger async refetch
                  fetchConversations(client, filters, 20)
                    .then(refreshedData => {
                      setConversations(refreshedData.conversations);
                      setHasMore(refreshedData.hasMore);
                      setCursor(refreshedData.cursor);
                    })
                    .catch(error => {
                      console.error('Failed to refresh conversations:', error);
                    });
                }
                return prev;
              });
            }
          )
          .subscribe();

      } catch (error) {
        console.error('Failed to setup realtime conversations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    setupRealtimeConversations();

    return () => {
      if (conversationChannel) {
        client.removeChannel(conversationChannel);
      }
      if (messageChannel) {
        client.removeChannel(messageChannel);
      }
    };
  }, [client, filters]);

  return {
    data: conversations,
    isLoading,
    hasMore,
    loadMore,
    isLoadingMore,
  };
}