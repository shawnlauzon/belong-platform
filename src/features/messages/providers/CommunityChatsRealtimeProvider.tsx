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
import { createMessageSubscription } from '../api';
import { useUserCommunities } from '@/features/communities';

interface CommunityChatsContextValue {
  channels: Map<string, RealtimeChannel>;
  getChannel: (communityId: string) => RealtimeChannel | undefined;
  isConnected: (communityId: string) => boolean;
  connectedCommunities: string[];
}

const CommunityChatsContext = createContext<
  CommunityChatsContextValue | undefined
>(undefined);

/**
 * Hook to access community chat channels.
 * Must be used within CommunityChatsRealtimeProvider.
 *
 * @example
 * ```tsx
 * function CommunityChat({ communityId }: { communityId: string }) {
 *   const { getChannel, isConnected } = useCommunityChatsChannels();
 *
 *   const channel = getChannel(communityId);
 *   const connected = isConnected(communityId);
 *
 *   if (!connected) {
 *     return <div>Connecting to community chat...</div>;
 *   }
 *
 *   return <div>Chat for community: {communityId}</div>;
 * }
 * ```
 */
export const useCommunityChatsChannels = (): CommunityChatsContextValue => {
  const context = useContext(CommunityChatsContext);
  if (!context) {
    throw new Error(
      'useCommunityChatsChannels must be used within CommunityChatsRealtimeProvider',
    );
  }
  return context;
};

/**
 * Provider that manages real-time community chat subscriptions.
 * Automatically subscribes to chat channels for all communities the user is a member of.
 * Updates subscriptions dynamically when user joins/leaves communities.
 *
 * This should be placed near the root of your app to ensure
 * community messages are received globally.
 */
export function CommunityChatsRealtimeProvider({
  children,
}: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: memberships } = useUserCommunities(currentUser?.id);
  const [channels, setChannels] = useState<Map<string, RealtimeChannel>>(
    new Map(),
  );
  const [connectionStates, setConnectionStates] = useState<Map<string, boolean>>(
    new Map(),
  );

  useEffect(() => {
    if (!supabase || !currentUser || !memberships) {
      // Clear all channels if no user or memberships
      setChannels((prevChannels) => {
        prevChannels.forEach((channel) => {
          supabase?.removeChannel(channel);
        });
        return new Map();
      });
      setConnectionStates(new Map());
      return;
    }

    const userId = currentUser.id;
    const currentCommunityIds = new Set(
      memberships.map((m) => m.communityId),
    );

    const setupCommunitySubscriptions = async () => {
      // Get current state values
      setChannels((prevChannels) => {
        const existingCommunityIds = new Set(prevChannels.keys());

        // Find communities to subscribe to (new memberships)
        const toSubscribe = [...currentCommunityIds].filter(
          (id) => !existingCommunityIds.has(id),
        );

        // Find communities to unsubscribe from (left communities)
        const toUnsubscribe = [...existingCommunityIds].filter(
          (id) => !currentCommunityIds.has(id),
        );

        // Early return if no changes needed
        if (toSubscribe.length === 0 && toUnsubscribe.length === 0) {
          return prevChannels;
        }

        try {
          const newChannels = new Map(prevChannels);

          // Unsubscribe from left communities
          for (const communityId of toUnsubscribe) {
            const channel = newChannels.get(communityId);
            if (channel) {
              logger.info('Unsubscribing from community chat', { communityId });
              supabase.removeChannel(channel);
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

          // Subscribe to new communities (async)
          for (const communityId of toSubscribe) {
            logger.info('Subscribing to community chat', { communityId, userId });
            createMessageSubscription({
              supabase,
              queryClient,
              communityId,
            }).then((channel) => {
              setChannels((current) => {
                const updated = new Map(current);
                updated.set(communityId, channel);
                return updated;
              });
              setConnectionStates((current) => {
                const updated = new Map(current);
                updated.set(communityId, true);
                return updated;
              });
            }).catch((error) => {
              logger.error(
                'CommunityChatsRealtimeProvider: failed to setup community subscription',
                {
                  error,
                  communityId,
                  userId,
                },
              );
              setConnectionStates((current) => {
                const updated = new Map(current);
                updated.set(communityId, false);
                return updated;
              });
            });
          }

          return newChannels;
        } catch (error) {
          logger.error(
            'CommunityChatsRealtimeProvider: error managing subscriptions',
            {
              error,
              userId,
              currentCommunityIds: Array.from(currentCommunityIds),
            },
          );
          return prevChannels;
        }
      });
    };

    setupCommunitySubscriptions();

    return () => {
      // Cleanup all channels on unmount
      setChannels((currentChannels) => {
        for (const channel of currentChannels.values()) {
          supabase?.removeChannel(channel);
        }
        return currentChannels;
      });
    };
  }, [supabase, currentUser, memberships, queryClient]);

  const contextValue: CommunityChatsContextValue = {
    channels,
    getChannel: (communityId: string) => channels.get(communityId),
    isConnected: (communityId: string) => connectionStates.get(communityId) ?? false,
    connectedCommunities: Array.from(connectionStates.entries())
      .filter(([, connected]) => connected)
      .map(([communityId]) => communityId),
  };

  return (
    <CommunityChatsContext.Provider value={contextValue}>
      {children}
    </CommunityChatsContext.Provider>
  );
}