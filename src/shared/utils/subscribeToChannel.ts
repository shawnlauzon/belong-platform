import type {
  RealtimeChannel,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js';
import { logger } from '../logger';

export interface SubscriptionRetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

/**
 * Adds retry logic to a Supabase RealtimeChannel subscription.
 *
 * @param channel - The configured RealtimeChannel (with .on() calls already added)
 * @param options - Retry configuration options
 * @returns The same channel with retry logic attached
 */
export function subscribeToChannel(
  channel: RealtimeChannel,
  options: SubscriptionRetryOptions = {},
): RealtimeChannel {
  const { maxRetries = 5, initialDelay = 1000, maxDelay = 30000 } = options;

  // Get channel name from the channel's topic
  const channelName = channel.topic;

  // Retry state - shared across all attempts
  let retryCount = 0;
  let retryDelay = initialDelay;
  let isRetrying = false;

  // Single subscription callback that handles retry logic
  const handleSubscriptionStatus = (
    status: REALTIME_SUBSCRIBE_STATES,
    err?: Error,
  ) => {
    logger.info('=== SUBSCRIPTION STATUS CHANGE ===', channelName, status, {
      retryCount,
    });

    if (err) {
      logger.error('=== SUBSCRIPTION ERROR ===', channelName, err);
    }

    // Check if this is a retry-worthy error state
    if (['CHANNEL_ERROR', 'TIMED_OUT'].includes(status)) {
      // Prevent concurrent retries
      if (isRetrying) {
        logger.debug('=== RETRY ALREADY IN PROGRESS ===', {
          channelName,
          retryCount,
        });
        return;
      }

      // Check if we've exceeded max retries
      if (retryCount >= maxRetries) {
        logger.error('=== MAX RETRIES EXCEEDED ===', {
          channelName,
          maxRetries,
          retryCount,
        });
        return;
      }

      isRetrying = true;

      // Unsubscribe from the failed channel
      channel
        .unsubscribe()
        .then(() => {
          logger.info('=== UNSUBSCRIBED FROM FAILED CHANNEL ===', {
            channelName,
            retryCount,
          });

          // Calculate delay with exponential backoff
          const delay = Math.min(retryDelay, maxDelay);

          logger.warn('=== SCHEDULING RETRY ===', {
            channelName,
            retryCount: retryCount + 1,
            delayMs: delay,
          });

          // Schedule retry
          setTimeout(() => {
            retryCount++;
            retryDelay = retryDelay * 2; // Exponential backoff
            isRetrying = false;

            logger.info('=== ATTEMPTING RECONNECTION ===', {
              channelName,
              retryCount,
            });

            // Resubscribe with the SAME callback (prevents multiple callbacks)
            channel.subscribe(handleSubscriptionStatus);
          }, delay);
        })
        .catch((unsubscribeError) => {
          logger.error('=== UNSUBSCRIBE FAILED ===', {
            channelName,
            error: unsubscribeError,
            retryCount,
          });
          isRetrying = false;
        });
    }
  };

  // Initial subscription with the retry handler
  channel.subscribe(handleSubscriptionStatus);

  return channel;
}
