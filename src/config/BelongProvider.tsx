import React, { useEffect, useMemo, createContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BelongClient, BelongClientConfig, createBelongClient } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { useConversations } from '@/features/messages/hooks/useConversations';
import { useUserCommunities } from '@/features/communities';
import { createNotificationSubscription } from '@/features/notifications/api/createNotificationSubscription';
import { createMessageSubscription } from '@/features/messages/api/createMessageSubscription';

// Client context for dependency injection following architecture pattern
export const ClientContext = createContext<BelongClient | undefined>(undefined);

// Contexts for realtime providers (for backward compatibility)
interface MessageRealtimeContextValue {
  channels: Map<string, RealtimeChannel>;
  isConnected: boolean;
  getChannel: (conversationId: string) => RealtimeChannel | undefined;
}

interface CommunityChatsContextValue {
  channels: Map<string, RealtimeChannel>;
  getChannel: (communityId: string) => RealtimeChannel | undefined;
  isConnected: (communityId: string) => boolean;
  connectedCommunities: string[];
}

const MessageRealtimeContext = createContext<
  MessageRealtimeContextValue | undefined
>(undefined);
const CommunityChatsContext = createContext<
  CommunityChatsContextValue | undefined
>(undefined);
/**
 * Props for the BelongProvider component.
 */
interface BelongProviderProps {
  /** React children to render within the provider context */
  children: React.ReactNode;
  /** Configuration object for initializing Belong clients */
  config: BelongClientConfig;
}

/**
 * Internal realtime manager that handles all real-time subscriptions.
 * Consolidates notification, message, and community chat subscriptions.
 *
 * @internal
 */
const RealtimeManager: React.FC<{
  children: React.ReactNode;
  client: BelongClient;
  enableRealtime: boolean;
}> = ({ children, client, enableRealtime }) => {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: conversations } = useConversations();
  const { data: memberships } = useUserCommunities(currentUser?.id);

  // Channel states
  const [notificationChannel, setNotificationChannel] =
    useState<RealtimeChannel | null>(null);
  const [messageChannels, setMessageChannels] = useState<
    Map<string, RealtimeChannel>
  >(new Map());
  const [communityChannels, setCommunityChannels] = useState<
    Map<string, RealtimeChannel>
  >(new Map());
  const [connectionStates, setConnectionStates] = useState<
    Map<string, boolean>
  >(new Map());

  // 1. Notification subscription
  useEffect(() => {
    if (!enableRealtime || !client.supabase || !currentUser) {
      if (notificationChannel) {
        client.supabase?.removeChannel(notificationChannel);
        setNotificationChannel(null);
      }
      return;
    }

    const setupNotifications = async () => {
      try {
        const channel = await createNotificationSubscription(
          client.supabase,
          queryClient,
        );
        setNotificationChannel(channel);
        logger.info('Notification subscription established', {
          userId: currentUser.id,
        });
      } catch (error) {
        logger.error('Failed to setup notification subscription', {
          error,
          userId: currentUser.id,
        });
      }
    };

    setupNotifications();

    return () => {
      if (notificationChannel) {
        client.supabase?.removeChannel(notificationChannel);
        setNotificationChannel(null);
      }
    };
  }, [
    enableRealtime,
    client.supabase,
    currentUser,
    queryClient,
    notificationChannel,
  ]);

  // 2. Message subscriptions (dynamic based on conversations)
  useEffect(() => {
    if (!enableRealtime || !client.supabase || !currentUser || !conversations) {
      setMessageChannels((prevChannels) => {
        prevChannels.forEach((channel) => {
          client.supabase?.removeChannel(channel);
        });
        return new Map();
      });
      return;
    }

    const setupMessageSubscriptions = async () => {
      setMessageChannels((prevChannels) => {
        const existingIds = new Set(prevChannels.keys());
        const currentIds = new Set(conversations.map((c) => c.id));

        // Unsubscribe from removed conversations
        const toUnsubscribe = [...existingIds].filter(
          (id) => !currentIds.has(id),
        );
        const toSubscribe = conversations.filter((c) => !existingIds.has(c.id));

        const newChannels = new Map(prevChannels);

        for (const conversationId of toUnsubscribe) {
          const channel = newChannels.get(conversationId);
          if (channel) {
            logger.info('Unsubscribing from conversation messages', {
              conversationId,
            });
            client.supabase.removeChannel(channel);
            newChannels.delete(conversationId);
          }
        }

        // Subscribe to new conversations
        for (const conversation of toSubscribe) {
          createMessageSubscription({
            supabase: client.supabase,
            queryClient,
            conversationId: conversation.id,
          })
            .then((channel: RealtimeChannel) => {
              setMessageChannels((current) =>
                new Map(current).set(conversation.id, channel),
              );
            })
            .catch((error: Error) => {
              logger.error('Failed to subscribe to conversation messages', {
                error,
                conversationId: conversation.id,
              });
            });
        }

        return newChannels;
      });
    };

    setupMessageSubscriptions();

    return () => {
      setMessageChannels((currentChannels) => {
        for (const channel of currentChannels.values()) {
          client.supabase?.removeChannel(channel);
        }
        return new Map();
      });
    };
  }, [
    enableRealtime,
    client.supabase,
    currentUser,
    conversations,
    queryClient,
  ]);

  // 3. Community chat subscriptions
  useEffect(() => {
    if (!enableRealtime || !client.supabase || !currentUser || !memberships) {
      setCommunityChannels((prevChannels) => {
        prevChannels.forEach((channel) => {
          client.supabase?.removeChannel(channel);
        });
        return new Map();
      });
      setConnectionStates(new Map());
      return;
    }

    const currentCommunityIds = new Set(memberships.map((m) => m.communityId));

    const setupCommunitySubscriptions = async () => {
      setCommunityChannels((prevChannels) => {
        const existingCommunityIds = new Set(prevChannels.keys());
        const toSubscribe = [...currentCommunityIds].filter(
          (id) => !existingCommunityIds.has(id),
        );
        const toUnsubscribe = [...existingCommunityIds].filter(
          (id) => !currentCommunityIds.has(id),
        );

        if (toSubscribe.length === 0 && toUnsubscribe.length === 0) {
          return prevChannels;
        }

        const newChannels = new Map(prevChannels);

        // Unsubscribe from left communities
        for (const communityId of toUnsubscribe) {
          const channel = newChannels.get(communityId);
          if (channel) {
            logger.info('Unsubscribing from community chat', { communityId });
            client.supabase.removeChannel(channel);
            newChannels.delete(communityId);
          }
        }

        // Update connection states for unsubscribed communities
        setConnectionStates((prevConnectionStates) => {
          const updated = new Map(prevConnectionStates);
          for (const communityId of toUnsubscribe) {
            updated.delete(communityId);
          }
          return updated;
        });

        // Subscribe to new communities
        for (const communityId of toSubscribe) {
          createMessageSubscription({
            supabase: client.supabase,
            queryClient,
            communityId,
          })
            .then((channel: RealtimeChannel) => {
              setCommunityChannels((current) =>
                new Map(current).set(communityId, channel),
              );
              setConnectionStates((current) =>
                new Map(current).set(communityId, true),
              );
            })
            .catch((error: Error) => {
              logger.error('Failed to subscribe to community chat', {
                error,
                communityId,
              });
              setConnectionStates((current) =>
                new Map(current).set(communityId, false),
              );
            });
        }

        return newChannels;
      });
    };

    setupCommunitySubscriptions();

    return () => {
      setCommunityChannels((currentChannels) => {
        for (const channel of currentChannels.values()) {
          client.supabase?.removeChannel(channel);
        }
        return new Map();
      });
    };
  }, [enableRealtime, client.supabase, currentUser, memberships, queryClient]);

  // Context values for backward compatibility
  const messageContextValue: MessageRealtimeContextValue = {
    channels: messageChannels,
    isConnected: messageChannels.size > 0,
    getChannel: (conversationId: string) => messageChannels.get(conversationId),
  };

  const communityChatsContextValue: CommunityChatsContextValue = {
    channels: communityChannels,
    getChannel: (communityId: string) => communityChannels.get(communityId),
    isConnected: (communityId: string) =>
      connectionStates.get(communityId) ?? false,
    connectedCommunities: Array.from(connectionStates.entries())
      .filter(([, connected]) => connected)
      .map(([communityId]) => communityId),
  };

  return (
    <MessageRealtimeContext.Provider value={messageContextValue}>
      <CommunityChatsContext.Provider value={communityChatsContextValue}>
        {children}
      </CommunityChatsContext.Provider>
    </MessageRealtimeContext.Provider>
  );
};

/**
 * Internal context provider that manages authentication state changes.
 * Handles automatic cache invalidation when users sign in/out.
 *
 * @internal
 */
const BelongContextProvider: React.FC<{
  children: React.ReactNode;
  client: BelongClient;
  enableRealtime: boolean;
}> = ({ children, client, enableRealtime }) => {
  const queryClient = useQueryClient();

  // Simplified auth state management following architecture document
  useEffect(() => {
    const {
      data: { subscription },
    } = client.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        queryClient.invalidateQueries({ queryKey: ['auth'] });
        queryClient.invalidateQueries({
          queryKey: ['user', session.user.id],
        });
      } else if (event === 'SIGNED_OUT') {
        queryClient.removeQueries({ queryKey: ['auth'] });
        queryClient.removeQueries({ queryKey: ['users'] });
      }
    });

    return () => subscription.unsubscribe();
  }, [client.supabase, queryClient]);

  if (enableRealtime) {
    return (
      <RealtimeManager client={client} enableRealtime={enableRealtime}>
        {children}
      </RealtimeManager>
    );
  }

  return <>{children}</>;
};

/**
 * Main provider component for the Belong Network platform.
 *
 * This provider creates and manages Supabase and Mapbox clients, handles authentication
 * state changes, and provides React Query context for all platform hooks. Must wrap
 * your entire application or the parts that use Belong Network functionality.
 *
 * @param props - Provider configuration and children
 * @returns JSX element providing platform context
 *
 * @example
 * ```tsx
 * import { BelongProvider } from '@belongnetwork/platform';
 * import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
 *
 * const queryClient = new QueryClient();
 *
 * function App() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <BelongProvider config={{
 *         supabase: {
 *           url: 'https://your-project.supabase.co',
 *           anonKey: 'your-anon-key'
 *         },
 *         mapbox: {
 *           accessToken: 'your-mapbox-token'
 *         }
 *       }}>
 *         <YourApp />
 *       </BelongProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Minimal setup without Mapbox
 * function MinimalApp() {
 *   return (
 *     <QueryClientProvider client={queryClient}>
 *       <BelongProvider config={{
 *         supabase: {
 *           url: process.env.REACT_APP_SUPABASE_URL,
 *           anonKey: process.env.REACT_APP_SUPABASE_ANON_KEY
 *         }
 *       }}>
 *         <YourApp />
 *       </BelongProvider>
 *     </QueryClientProvider>
 *   );
 * }
 * ```
 *
 * @category Providers
 */
export const BelongProvider: React.FC<BelongProviderProps> = ({
  children,
  config,
}) => {
  // Create client from config
  const client = useMemo(() => createBelongClient(config), [config]);
  const enableRealtime = config.enableRealtime ?? true;

  return (
    <ClientContext.Provider value={client}>
      <BelongContextProvider client={client} enableRealtime={enableRealtime}>
        {children}
      </BelongContextProvider>
    </ClientContext.Provider>
  );
};

// Export hooks for backward compatibility with existing realtime providers
export const useMyMessagesRealtimeChannel = (): MessageRealtimeContextValue => {
  const context = React.useContext(MessageRealtimeContext);
  if (!context) {
    throw new Error(
      'useMyMessagesRealtimeChannel must be used within BelongProvider with realtime enabled',
    );
  }
  return context;
};

export const useCommunityChatsChannels = (): CommunityChatsContextValue => {
  const context = React.useContext(CommunityChatsContext);
  if (!context) {
    throw new Error(
      'useCommunityChatsChannels must be used within BelongProvider with realtime enabled',
    );
  }
  return context;
};
