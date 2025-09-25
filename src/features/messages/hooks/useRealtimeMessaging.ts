import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase, logger } from '@/shared';
import { createMessageSubscription } from '../api';

/**
 * Hook that subscribes to real-time messages for a specific community chat or conversation.
 * Automatically subscribes when the component mounts and unsubscribes when it unmounts.
 *
 * This hook should be used in chat components to receive real-time
 * message updates only when the chat is actively being viewed.
 *
 * @param communityId - The ID of the community to subscribe to (mutually exclusive with conversationId)
 * @param conversationId - The ID of the conversation to subscribe to (mutually exclusive with communityId)
 * @returns Ref object containing the RealtimeChannel (or null if not connected)
 *
 * @example
 * ```tsx
 * function CommunityChannelView({ communityId }: { communityId: string }) {
 *   const channelRef = useRealtimeMessaging({ communityId });
 *   const { data: messages } = useCommunityMessages(communityId);
 *   const isConnected = !!channelRef.current;
 *
 *   return (
 *     <div>
 *       {!isConnected && <div>Connecting to community chat...</div>}
 *       {messages?.map(message => (
 *         <MessageBubble key={message.id} message={message} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeMessaging({
  communityId,
  conversationId,
}: {
  communityId?: string;
  conversationId?: string;
}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Validate: exactly one must be provided
  if ((!conversationId && !communityId) || (conversationId && communityId)) {
    throw new Error('Provide either conversationId or communityId, not both');
  }

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isComponentMounted = true;

    const setupSubscription = async () => {
      try {
        logger.info('Setting up message subscription', {
          communityId,
          conversationId,
        });

        const channel = await createMessageSubscription({
          supabase,
          queryClient,
          communityId,
          conversationId,
        });

        if (isComponentMounted) {
          channelRef.current = channel;
        } else {
          // Component unmounted while we were setting up - clean up immediately
          supabase.removeChannel(channel);
        }
      } catch (error) {
        logger.error('Failed to setup message subscription', {
          error,
          communityId,
          conversationId,
        });
      }
    };

    setupSubscription();

    return () => {
      isComponentMounted = false;
      if (channelRef.current) {
        logger.info('Cleaning up message subscription', {
          communityId,
          conversationId,
        });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [communityId, conversationId, supabase, queryClient]);

  return channelRef;
}
