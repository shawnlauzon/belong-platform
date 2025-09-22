import {
  useEffect,
  PropsWithChildren,
  createContext,
  useContext,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useConversations } from '../hooks/useConversations';
import { createMessageSubscription } from '../api/createMessageSubscription';
import type { Conversation } from '../types';

interface MessageRealtimeContextValue {
  channels: Map<string, RealtimeChannel>;
  isConnected: boolean;
  getChannel: (conversationId: string) => RealtimeChannel | undefined;
}

const MessageRealtimeContext = createContext<
  MessageRealtimeContextValue | undefined
>(undefined);

/**
 * Hook to access message realtime channels.
 * Must be used within MessageRealtimeProvider.
 *
 * // Access the RealtimeChannels from any component within MessageRealtimeProvider
 * import { useMyMessagesRealtimeChannel } from '@belongnetwork/platform';
 *
 * function MyComponent() {
 *   const { channels, isConnected, getChannel } = useMyMessagesRealtimeChannel();
 *
 *   const conversationChannel = getChannel('conversation-id');
 *   return <div>Connected: {isConnected}, Channels: {channels.size}</div>;
 * }
 */
export const useMyMessagesRealtimeChannel = (): MessageRealtimeContextValue => {
  const context = useContext(MessageRealtimeContext);
  if (!context) {
    throw new Error(
      'useMyMessagesRealtimeChannel must be used within MessageRealtimeProvider',
    );
  }
  return context;
};

/**
 * Provider that manages real-time message subscriptions.
 * Updates React Query cache when new messages arrive or conversations update.
 *
 * This should be placed near the root of your app to ensure
 * messages are received globally.
 */
export function MyMessagesRealtimeProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: conversations } = useConversations();
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!supabase || !currentUser || !conversations) {
      // Clean up existing channels
      setChannels((prevChannels) => {
        prevChannels.forEach((channel) => {
          supabase?.removeChannel(channel);
        });
        return new Map();
      });
      setIsConnected(false);
      return;
    }

    const setupConversationSubscriptions = async () => {
      setChannels((prevChannels) => {
        const existingIds = new Set(prevChannels.keys());
        const currentIds = new Set(conversations.map((c: Conversation) => c.id));

        // Find conversations to unsubscribe from (removed conversations)
        const toUnsubscribe = [...existingIds].filter(id => !currentIds.has(id));

        // Find conversations to subscribe to (new conversations)
        const toSubscribe = conversations.filter((c: Conversation) => !existingIds.has(c.id));

        const newChannels = new Map(prevChannels);

        // Unsubscribe from removed conversations
        for (const conversationId of toUnsubscribe) {
          const channel = newChannels.get(conversationId);
          if (channel) {
            logger.info('Unsubscribing from conversation messages', { conversationId });
            supabase.removeChannel(channel);
            newChannels.delete(conversationId);
          }
        }

        // Subscribe to new conversations
        for (const conversation of toSubscribe) {
          logger.info('Subscribing to conversation messages', { conversationId: conversation.id });

          createMessageSubscription({
            supabase,
            queryClient,
            conversationId: conversation.id,
          }).then((channel: RealtimeChannel) => {
            setChannels((current) => {
              const updated = new Map(current);
              updated.set(conversation.id, channel);
              return updated;
            });

            logger.debug('Successfully subscribed to conversation messages', {
              conversationId: conversation.id
            });
          }).catch((error: Error) => {
            logger.error('Failed to subscribe to conversation messages', {
              error,
              conversationId: conversation.id,
            });
          });
        }

        return newChannels;
      });

      setIsConnected(conversations.length > 0);
    };

    setupConversationSubscriptions();

    return () => {
      // Cleanup all channels on unmount
      setChannels((currentChannels) => {
        for (const channel of currentChannels.values()) {
          supabase?.removeChannel(channel);
        }
        return new Map();
      });
    };
  }, [supabase, currentUser, conversations, queryClient]);

  const contextValue: MessageRealtimeContextValue = {
    channels,
    isConnected,
    getChannel: (conversationId: string) => channels.get(conversationId),
  };

  return (
    <MessageRealtimeContext.Provider value={contextValue}>
      {children}
    </MessageRealtimeContext.Provider>
  );
}
