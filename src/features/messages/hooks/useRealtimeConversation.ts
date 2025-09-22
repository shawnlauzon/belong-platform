import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useSupabase, logger } from '@/shared';
import { createMessageSubscription } from '../api';

/**
 * Hook that subscribes to real-time messages for a specific conversation.
 * Automatically subscribes when the component mounts and unsubscribes when it unmounts.
 *
 * This hook should be used in conversation/chat components to receive real-time
 * message updates only when the conversation is actively being viewed.
 *
 * @param conversationId - The ID of the conversation to subscribe to
 * @returns Object with connection status
 *
 * @example
 * ```tsx
 * function ConversationView({ conversationId }: { conversationId: string }) {
 *   const { isConnected } = useRealtimeConversation(conversationId);
 *   const { data: messages } = useMessages(conversationId);
 *
 *   return (
 *     <div>
 *       {!isConnected && <div>Connecting to real-time updates...</div>}
 *       {messages?.map(message => (
 *         <MessageBubble key={message.id} message={message} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeConversation(conversationId: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!conversationId || !supabase) {
      return;
    }

    let isCancelled = false;

    const setupSubscription = async () => {
      try {
        logger.info('Setting up conversation subscription', { conversationId });

        const channel = await createMessageSubscription({
          supabase,
          queryClient,
          conversationId,
        });

        if (!isCancelled) {
          channelRef.current = channel;
        } else {
          // If effect was cancelled while we were setting up, clean up
          supabase.removeChannel(channel);
        }
      } catch (error) {
        logger.error('Failed to setup conversation subscription', {
          error,
          conversationId,
        });
      }
    };

    setupSubscription();

    return () => {
      isCancelled = true;
      if (channelRef.current) {
        logger.info('Cleaning up conversation subscription', { conversationId });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, supabase, queryClient]);

  return {
    isConnected: !!channelRef.current,
  };
}