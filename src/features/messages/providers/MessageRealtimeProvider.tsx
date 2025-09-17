import { useEffect, PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';

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

  useEffect(() => {
    if (!supabase) {
      return;
    }

    // TODO: Implement global message subscription when needed
    logger.info('MessageRealtimeProvider: Global message subscription not yet implemented');
  }, [supabase, queryClient]);

  return <>{children}</>;
}
