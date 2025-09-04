import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

export interface NotificationSubscriptionCallbacks {
  onNotification: (payload: any) => void;
  onStatusChange?: (status: string, error?: any) => void;
}

/**
 * Subscribe to real-time notifications for a specific user
 */
export function subscribeToNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  callbacks: NotificationSubscriptionCallbacks,
): RealtimeChannel {
  logger.debug('subscribeToNotifications: setting up realtime subscription', {
    userId,
    channelName: `user:${userId}:notifications`,
  });

  const channel = supabase
    .channel(`user:${userId}:notifications`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        logger.info(
          'subscribeToNotifications: received new notification via realtime',
          {
            userId,
            notificationId: payload.new?.id,
            type: payload.new?.type,
            payloadStructure: {
              hasNew: !!payload.new,
              hasOld: !!payload.old,
              eventType: payload.eventType,
              schema: payload.schema,
              table: payload.table,
              commit_timestamp: payload.commit_timestamp,
              errors: payload.errors,
            },
            fullPayload: payload,
          },
        );

        // Call the provided callback
        callbacks.onNotification(payload);
      },
    )
    .subscribe((status, err) => {
      logger.info(
        'subscribeToNotifications: realtime subscription callback triggered',
        {
          status,
          hasError: !!err,
          userId,
          channelName: `user:${userId}:notifications`,
        },
      );

      if (err) {
        logger.error('subscribeToNotifications: realtime subscription error', {
          error: err,
          errorMessage: err?.message,
          errorName: err?.name,
          errorStack: err?.stack,
          errorDetails: JSON.stringify(err),
          userId,
          channelName: `user:${userId}:notifications`,
          subscriberStatus: status,
        });
      } else {
        logger.info(
          'subscribeToNotifications: realtime subscription established',
          {
            status,
            userId,
            channelName: `user:${userId}:notifications`,
          },
        );
      }

      // Call optional status change callback
      if (callbacks.onStatusChange) {
        callbacks.onStatusChange(status, err);
      }
    });

  return channel;
}