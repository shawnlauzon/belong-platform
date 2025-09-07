import { useEffect, PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { createMessageSubscription, type MessageSubscriptionResult } from '../api/createMessageSubscription';

/**
 * Provider that manages real-time message subscriptions.
 * Updates React Query cache when new messages arrive or conversations update.
 * 
 * This should be placed near the root of your app to ensure
 * messages are received globally.
 */
export function MessageRealtimeProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const userId = currentUser.id;
    let subscriptionResult: MessageSubscriptionResult | undefined;

    const setupRealtimeMessaging = async () => {
      try {
        subscriptionResult = await createMessageSubscription({
          supabase,
          queryClient,
          userId,
          currentUser,
          logger,
        });
      } catch (error) {
        logger.error('MessageRealtimeProvider: failed to setup messaging', {
          error,
          userId,
        });
      }
    };

    setupRealtimeMessaging();

    return () => {
      if (subscriptionResult) {
        subscriptionResult.cleanup();
      }
    };
  }, [supabase, currentUser, queryClient]);

  return <>{children}</>;
}