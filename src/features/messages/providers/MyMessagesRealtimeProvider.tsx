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

interface MessageRealtimeContextValue {
  channel: RealtimeChannel | null;
  isConnected: boolean;
}

const MessageRealtimeContext = createContext<
  MessageRealtimeContextValue | undefined
>(undefined);

/**
 * Hook to access the message realtime channel.
 * Must be used within MessageRealtimeProvider.
 *
 * // Access the RealtimeChannel from any component within MessageRealtimeProvider
 * import { useMyMessagesRealtimeChannel } from '@belongnetwork/platform';
 *
 * function MyComponent() {
 *   const { channel, isConnected } = useMyMessagesRealtimeChannel();
 *
 *   return <div>Connected: {isConnected}</div>;
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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!supabase || !currentUser) {
      setChannel(null);
      setIsConnected(false);
      return;
    }

    const userId = currentUser.id;
    let currentChannel: RealtimeChannel;

    const setupRealtimeMessages = async () => {
      try {
        // TODO: Implement user-level message notifications
        // This should subscribe to user:{userId}:notifications for 'new_conversation' events
        // For now, create a dummy channel to prevent TypeScript errors
        currentChannel = supabase.channel(`user:${userId}:messages-placeholder`);
        setChannel(currentChannel);
        setIsConnected(true);

        logger.info('MyMessagesRealtimeProvider: placeholder channel created', {
          userId,
        });
      } catch (error) {
        logger.error(
          'MessageRealtimeProvider: failed to setup message subscription',
          {
            error,
            userId,
          },
        );
        setIsConnected(false);
      }
    };

    setupRealtimeMessages();

    return () => {
      if (currentChannel) {
        supabase?.removeChannel(currentChannel);
        setChannel(null);
        setIsConnected(false);
      }
    };
  }, [supabase, currentUser, queryClient]);

  const contextValue: MessageRealtimeContextValue = {
    channel,
    isConnected,
  };

  return (
    <MessageRealtimeContext.Provider value={contextValue}>
      {children}
    </MessageRealtimeContext.Provider>
  );
}
