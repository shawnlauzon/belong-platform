import { useEffect, PropsWithChildren } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createNotificationSubscription } from '../api/createNotificationSubscription';

/**
 * Provider that manages real-time notification subscriptions.
 * Updates React Query cache when new notifications arrive.
 *
 * This should be placed near the root of your app to ensure
 * notifications are received globally.
 */
export function NotificationRealtimeProvider({ children }: PropsWithChildren) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  useEffect(() => {
    if (!supabase || !currentUser) {
      return;
    }

    const userId = currentUser.id;
    let channel: RealtimeChannel;

    const setupRealtimeNotifications = async () => {
      try {
        channel = await createNotificationSubscription({
          supabase,
          queryClient,
          userId,
        });
      } catch (error) {
        logger.error(
          'NotificationRealtimeProvider: failed to setup notifications',
          {
            error,
            userId,
          },
        );
      }
    };

    setupRealtimeNotifications();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [supabase, currentUser, queryClient]);

  return <>{children}</>;
}
