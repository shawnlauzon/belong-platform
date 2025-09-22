import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase, logger } from '@/shared';
import { createMessageSubscription } from '../api';

/**
 * Hook that subscribes to real-time messages for a specific community chat.
 * Automatically subscribes when the component mounts and unsubscribes when it unmounts.
 *
 * This hook should be used in community chat components to receive real-time
 * message updates only when the community chat is actively being viewed.
 *
 * @param communityId - The ID of the community to subscribe to
 * @returns Object with connection status
 *
 * @example
 * ```tsx
 * function CommunityChannelView({ communityId }: { communityId: string }) {
 *   const { isConnected } = useRealtimeCommunityChat(communityId);
 *   const { data: messages } = useCommunityMessages(communityId);
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
export function useRealtimeCommunityChat(communityId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!communityId || !supabase) {
      return;
    }

    let isCancelled = false;

    const setupSubscription = async () => {
      try {
        logger.info('Setting up community channel subscription', { communityId });

        const channel = await createMessageSubscription({
          supabase,
          queryClient,
          communityId,
        });

        if (!isCancelled) {
          channelRef.current = channel;
        } else {
          // If effect was cancelled while we were setting up, clean up
          supabase.removeChannel(channel);
        }
      } catch (error) {
        logger.error('Failed to setup community channel subscription', {
          error,
          communityId,
        });
      }
    };

    setupSubscription();

    return () => {
      isCancelled = true;
      if (channelRef.current) {
        logger.info('Cleaning up community channel subscription', { communityId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [communityId, supabase, queryClient]);

  return {
    isConnected: !!channelRef.current,
  };
}