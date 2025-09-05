import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { logger } from '@/shared';

// Type for Supabase postgres_changes payload
interface PostgresChangesPayload {
  new: Record<string, unknown> & { id?: string };
  old?: Record<string, unknown>;
  eventType: string;
  schema: string;
  table: string;
  commit_timestamp: string;
  errors?: unknown;
}

export interface NotificationSubscriptionCallbacks {
  onNotification: (payload: PostgresChangesPayload) => void;
  onStatusChange?: (status: string, error?: unknown) => void;
}

export interface NotificationSubscriptionOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface NotificationSubscription {
  channel: RealtimeChannel;
  cleanup: () => Promise<void>;
  retryCount?: number;
}


/**
 * Helper function to sleep for a given number of milliseconds
 */
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/**
 * Helper function to wait for realtime connection to be established
 */
function waitForConnection(supabase: SupabaseClient<Database>, maxWaitMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (supabase.realtime.isConnected()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (supabase.realtime.isConnected()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        reject(new Error(`Realtime connection timeout after ${maxWaitMs}ms`));
      }
    }, 100);
  });
}

/**
 * Subscribe to real-time notifications for a specific user with automatic retry on channel errors
 */
export async function subscribeToNotifications(
  supabase: SupabaseClient<Database>,
  userId: string,
  callbacks: NotificationSubscriptionCallbacks,
  options: NotificationSubscriptionOptions = {},
): Promise<NotificationSubscription> {
  const maxRetries = options.maxRetries ?? 20;
  const retryDelayMs = options.retryDelayMs ?? 300;
  
  let retryCount = 0;
  let isRetrying = false;
  let cancelRetry = false;
  
  const attemptSubscription = async (): Promise<NotificationSubscription> => {
    logger.debug('subscribeToNotifications: setting up realtime subscription', {
      userId,
      channelName: `user:${userId}:notifications`,
      attemptNumber: retryCount + 1,
      maxRetries,
    });

    // Ensure realtime connection is established before creating channel
    if (!supabase.realtime.isConnected()) {
      logger.debug('subscribeToNotifications: connecting to realtime', {
        userId,
        connectionState: supabase.realtime.connectionState(),
      });
      supabase.realtime.connect();
      
      // Wait for connection to be established
      try {
        await waitForConnection(supabase);
      } catch (error) {
        logger.error('subscribeToNotifications: failed to establish realtime connection', {
          userId,
          error,
        });
        throw error;
      }
    }

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
      .subscribe(async (status, err) => {
        logger.info(
          'subscribeToNotifications: realtime subscription callback triggered',
          {
            status,
            hasError: !!err,
            userId,
            channelName: `user:${userId}:notifications`,
            retryCount,
          },
        );

        // Handle channel errors with retry logic
        if (status === 'CHANNEL_ERROR' && !isRetrying && !cancelRetry) {
          if (retryCount < maxRetries) {
            isRetrying = true;
            retryCount++;
            
            logger.warn('subscribeToNotifications: channel error detected, attempting retry', {
              userId,
              error: err,
              retryCount,
              maxRetries,
              nextRetryInMs: retryDelayMs,
            });
            
            // Clean up the failed channel
            await channel.unsubscribe();
            supabase.removeChannel(channel);
            
            // Wait before retrying
            await sleep(retryDelayMs);
            
            // Check if we should still retry (cleanup may have been called)
            if (!cancelRetry) {
              logger.info('subscribeToNotifications: retrying subscription', {
                userId,
                retryCount,
                maxRetries,
              });
              
              // Attempt to resubscribe
              try {
                const newSubscription = await attemptSubscription();
                // Update the cleanup function to use the new subscription
                Object.assign(subscription, newSubscription);
                isRetrying = false;
              } catch (retryError) {
                logger.error('subscribeToNotifications: retry failed', {
                  userId,
                  retryCount,
                  error: retryError,
                });
                isRetrying = false;
              }
            }
          } else {
            logger.error('subscribeToNotifications: max retries exceeded for channel error', {
              userId,
              retryCount,
              maxRetries,
              error: err,
            });
          }
        }

        if (err && status !== 'CHANNEL_ERROR') {
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
        } else if (!err) {
          logger.info(
            'subscribeToNotifications: realtime subscription established',
            {
              status,
              userId,
              channelName: `user:${userId}:notifications`,
              successAfterRetries: retryCount,
            },
          );
          // Reset retry count on successful connection
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            isRetrying = false;
          }
        }

        // Call optional status change callback
        if (callbacks.onStatusChange) {
          callbacks.onStatusChange(status, err);
        }
      });

    const cleanup = async () => {
      // Signal that we should stop retrying
      cancelRetry = true;
      
      await channel.unsubscribe();
      supabase.removeChannel(channel);
      
      // Wait for connection to properly close to prevent test isolation issues
      // The connection needs time to transition from 'open' to 'closed' state
      const startTime = Date.now();
      const maxWaitMs = 3000; // 3 second timeout
      
      while (supabase.realtime.isConnected() || supabase.realtime.connectionState() !== 'closed') {
        if (Date.now() - startTime > maxWaitMs) {
          logger.warn('subscribeToNotifications: cleanup timeout, connection did not close properly', {
            userId,
            finalState: supabase.realtime.connectionState(),
            finalConnected: supabase.realtime.isConnected(),
          });
          break;
        }
        
        await sleep(100);
      }
    };

    const subscription: NotificationSubscription = {
      channel,
      cleanup,
      retryCount,
    };

    return subscription;
  };
  
  // Start the initial subscription attempt
  return attemptSubscription();
}