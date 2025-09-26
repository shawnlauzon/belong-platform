import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { useSupabase } from '@/shared';
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
  onStatusChange,
}: {
  communityId?: string;
  conversationId?: string;
  onStatusChange?: (status: string, isConnecting: boolean) => void;
}) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const forceResetTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Separate timeout for force resets
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const subscriptionIdRef = useRef(0); // Track subscription attempts
  const isFailedStateRef = useRef(false);
  const lastFailureTimeRef = useRef<number>(0);
  const failureCountRef = useRef(0);
  const isSettingUpRef = useRef(false); // Mutex to prevent concurrent setups
  const isIntentionalDisconnectRef = useRef(false); // Track intentional disconnections
  const isSuccessfullyConnectedRef = useRef(false); // Track if we have a working connection
  const lastErrorTimeRef = useRef<number>(0); // Track last error time for deduplication
  const MAX_RETRIES = 10;
  const CIRCUIT_BREAKER_THRESHOLD = 5; // After 5 failures, wait longer
  const CIRCUIT_BREAKER_DELAY = 30000; // 30 seconds
  const RETRY_BASE_DELAY = 100; // Base delay in ms
  const RETRY_MAX_DELAY = 8000; // Maximum delay in ms (8 seconds)

  // Validate: exactly one must be provided
  if ((!conversationId && !communityId) || (conversationId && communityId)) {
    throw new Error('Provide either conversationId or communityId, not both');
  }

  const forceReset = useCallback(() => {
    logger.debug('🔄 Force resetting all subscription state');

    // Clear all timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (forceResetTimeoutRef.current) {
      clearTimeout(forceResetTimeoutRef.current);
      forceResetTimeoutRef.current = null;
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    // Force remove any existing channel
    if (channelRef.current) {
      logger.debug('🧹 Force removing existing channel');
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        logger.warn('⚠️ Error removing channel (continuing anyway):', e);
      }
      channelRef.current = null;
    }

    // Reset all state
    retryCountRef.current = 0;
    isFailedStateRef.current = false;
    failureCountRef.current = 0;
    isSettingUpRef.current = false; // Reset mutex
    isIntentionalDisconnectRef.current = false; // Reset intentional disconnect flag
    isSuccessfullyConnectedRef.current = false; // Reset success state
    subscriptionIdRef.current++; // Increment to invalidate old callbacks
  }, [supabase]);

  const setupSubscription = useCallback(
    async (isRetry = false, shouldForceReset = false) => {
      if (shouldForceReset) {
        logger.info('🚨 FRESH START WITH FORCE RESET PATH!!', {
          isRetry,
          shouldForceReset,
          currentRetryCount: retryCountRef.current,
          subscriptionId: subscriptionIdRef.current,
        });
      } else if (isRetry) {
        logger.info('🔄 NORMAL RETRY PATH', {
          isRetry,
          shouldForceReset,
          currentRetryCount: retryCountRef.current,
          subscriptionId: subscriptionIdRef.current,
        });
      } else {
        logger.info('🆕 INITIAL SETUP PATH', {
          isRetry,
          shouldForceReset,
          currentRetryCount: retryCountRef.current,
          subscriptionId: subscriptionIdRef.current,
        });
      }
      // Check if already setting up
      if (isSettingUpRef.current) {
        logger.debug('⏭️ Already setting up subscription, skipping...');
        return;
      }

      // Indicate that we're connecting
      if (onStatusChange) {
        onStatusChange('', true); // No status yet, but connecting
      }

      // Increment subscription ID for new attempts to invalidate old callbacks
      if (!isRetry) {
        subscriptionIdRef.current++;
      }

      const currentSubscriptionId = subscriptionIdRef.current;
      isSettingUpRef.current = true; // Set mutex

      try {
        // Circuit breaker: if we've failed too many times recently, wait longer
        const now = Date.now();
        if (
          failureCountRef.current >= CIRCUIT_BREAKER_THRESHOLD &&
          now - lastFailureTimeRef.current < CIRCUIT_BREAKER_DELAY
        ) {
          logger.warn(
            '🚫 Circuit breaker active - too many recent failures, waiting...',
          );
          isSettingUpRef.current = false;
          return;
        }

        if (shouldForceReset || isFailedStateRef.current) {
          logger.warn(
            '🆘 Subscription in failed state, forcing complete reset',
          );
          forceReset(); // This now correctly calls the forceReset function
          // Wait a bit longer after reset
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (isRetry) {
          logger.info(
            `🔄 Retrying message subscription (attempt ${
              retryCountRef.current + 1
            }/${MAX_RETRIES})`,
            {
              communityId,
              conversationId,
              subscriptionId: currentSubscriptionId,
            },
          );
        } else {
          logger.info('🔄 Setting up message subscription', {
            communityId,
            conversationId,
            subscriptionId: currentSubscriptionId,
          });
          logger.warn('🔄 RESETTING RETRY COUNT TO 0 - new subscription', {
            previousRetryCount: retryCountRef.current,
            subscriptionId: currentSubscriptionId,
          });
          retryCountRef.current = 0;
          isIntentionalDisconnectRef.current = false; // Reset when starting new subscription
        }

        // Clear any existing channel first
        if (channelRef.current) {
          logger.debug('🧹 Removing existing channel before creating new one');
          try {
            supabase.removeChannel(channelRef.current);
          } catch (e) {
            logger.warn('⚠️ Error removing existing channel:', e);
          }
          channelRef.current = null;
        }

        // Wait longer for WebSocket connection to establish properly
        await new Promise((resolve) => setTimeout(resolve, 600));

        const channel = await createMessageSubscription({
          supabase,
          queryClient,
          communityId,
          conversationId,
          onStatusChange: (status: string, isConnecting: boolean) => {
            // Check if this callback is from an old subscription
            if (currentSubscriptionId !== subscriptionIdRef.current) {
              logger.debug(
                '🚫 Ignoring status callback from old subscription',
                {
                  callbackId: currentSubscriptionId,
                  currentId: subscriptionIdRef.current,
                  status,
                  isConnecting,
                },
              );
              return;
            }

            // Pass status to UI callback
            if (onStatusChange) {
              onStatusChange(status, isConnecting);
            }

            if (status === 'SUBSCRIBED') {
              logger.info('✅ Subscription success callback', {
                status,
                subscriptionId: currentSubscriptionId,
                timestamp: new Date().toISOString(),
              });

              // Mark as successfully connected and clear any pending timeouts
              isSuccessfullyConnectedRef.current = true;
              retryCountRef.current = 0;
              failureCountRef.current = 0;
              isFailedStateRef.current = false;

              // Clear any scheduled timeouts now that we're connected
              if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
              }

              if (forceResetTimeoutRef.current) {
                clearTimeout(forceResetTimeoutRef.current);
                forceResetTimeoutRef.current = null;
              }
            } else if (
              status === 'CHANNEL_ERROR' ||
              status === 'TIMED_OUT' ||
              status === 'CLOSED'
            ) {
              // Check if this is an intentional disconnection first
              if (isIntentionalDisconnectRef.current) {
                return;
              }

              // Deduplicate rapid error callbacks (both _onConnError and _onConnClose fire CHANNEL_ERROR)
              const now = Date.now();
              if (now - lastErrorTimeRef.current < 100) {
                logger.debug('🚫 Ignoring duplicate error callback', {
                  status,
                  timeSinceLastError: now - lastErrorTimeRef.current,
                  subscriptionId: currentSubscriptionId,
                });
                return;
              }
              lastErrorTimeRef.current = now;

              logger.warn('📡 Channel error callback', {
                status,
                subscriptionId: currentSubscriptionId,
                retryCount: retryCountRef.current,
              });

              if (
                (status === 'CHANNEL_ERROR' ||
                  status === 'TIMED_OUT' ||
                  status === 'CLOSED') &&
                retryCountRef.current < MAX_RETRIES
              ) {
                // If we were successfully connected, start fresh retry sequence
                if (isSuccessfullyConnectedRef.current) {
                  retryCountRef.current = 0;
                  isSuccessfullyConnectedRef.current = false;
                }

                const oldRetryCount = retryCountRef.current;
                retryCountRef.current++;

                // Calculate exponential backoff delay
                const retryDelay = Math.min(
                  RETRY_BASE_DELAY * Math.pow(2, oldRetryCount),
                  RETRY_MAX_DELAY,
                );

                logger.warn(
                  `⚠️ Channel ${status}, scheduling retry in ${retryDelay}ms - RETRY COUNT: ${oldRetryCount} → ${retryCountRef.current}`,
                );

                // Indicate we're retrying by calling onStatusChange with isConnecting=true
                if (onStatusChange) {
                  onStatusChange(status, true);
                }

                // Clear any existing retry
                if (retryTimeoutRef.current) {
                  clearTimeout(retryTimeoutRef.current);
                  retryTimeoutRef.current = null;
                }

                retryTimeoutRef.current = setTimeout(() => {
                  logger.debug('⏰ Retry timeout executing', {
                    scheduledForId: currentSubscriptionId,
                    currentSubscriptionIdRef: subscriptionIdRef.current,
                    matches:
                      currentSubscriptionId === subscriptionIdRef.current,
                    retryCount: retryCountRef.current,
                    timestamp: new Date().toISOString(),
                  });

                  // Double-check we're still the current subscription
                  if (currentSubscriptionId === subscriptionIdRef.current) {
                    isSettingUpRef.current = false; // Make sure mutex is released before retry
                    setupSubscription(true, false);
                  } else {
                    logger.debug('🚫 Skipping retry - subscription ID changed');
                  }
                }, retryDelay);
              } else {
                logger.error(
                  `❌ Channel failed after ${retryCountRef.current} retries`,
                );
                isFailedStateRef.current = true;
                failureCountRef.current++;
                lastFailureTimeRef.current = Date.now();

                // Schedule a force reset after a longer delay
                const resetDelay =
                  failureCountRef.current >= CIRCUIT_BREAKER_THRESHOLD
                    ? CIRCUIT_BREAKER_DELAY
                    : 10000;
                logger.warn(
                  `🔄 Scheduling force reset in ${resetDelay}ms (failure count: ${failureCountRef.current})`,
                  {
                    currentSubscriptionId,
                    currentSubscriptionIdRef: subscriptionIdRef.current,
                    timestamp: new Date().toISOString(),
                  },
                );

                forceResetTimeoutRef.current = setTimeout(() => {
                  logger.error('🚨 FORCE RESET PATH EXECUTING 🚨');
                  logger.warn('🆘 Force reset timeout executing', {
                    scheduledForId: currentSubscriptionId,
                    currentSubscriptionIdRef: subscriptionIdRef.current,
                    matches:
                      currentSubscriptionId === subscriptionIdRef.current,
                    isSuccessfullyConnected: isSuccessfullyConnectedRef.current,
                    timestamp: new Date().toISOString(),
                  });

                  // Don't reset if we're successfully connected
                  if (isSuccessfullyConnectedRef.current) {
                    logger.debug(
                      '✅ Skipping force reset - subscription is working correctly',
                    );
                    forceResetTimeoutRef.current = null;
                    return;
                  }

                  if (currentSubscriptionId === subscriptionIdRef.current) {
                    logger.warn('🆘 Attempting force reset after failure');
                    isSettingUpRef.current = false; // Make sure mutex is released
                    setupSubscription(false, true);
                  } else {
                    logger.debug(
                      '🚫 Skipping force reset - subscription ID changed',
                    );
                  }
                  forceResetTimeoutRef.current = null;
                }, resetDelay);
              }
            }
          },
        });

        // Check again if we're still the current subscription
        if (currentSubscriptionId !== subscriptionIdRef.current) {
          logger.debug('🚫 Subscription cancelled during setup, cleaning up');
          supabase.removeChannel(channel);
          return;
        }

        channelRef.current = channel;
        isFailedStateRef.current = false; // Reset failed state on success
        failureCountRef.current = 0; // Reset circuit breaker on success
        lastFailureTimeRef.current = 0; // Reset failure timestamp on success
        isSuccessfullyConnectedRef.current = true; // Mark as successfully connected
        isSettingUpRef.current = false; // Release mutex on success

        // Clear any pending timeouts on success
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        if (forceResetTimeoutRef.current) {
          clearTimeout(forceResetTimeoutRef.current);
          forceResetTimeoutRef.current = null;
        }
      } catch (error) {
        isSettingUpRef.current = false; // Release mutex on error

        // Check if we're still the current subscription
        if (currentSubscriptionId !== subscriptionIdRef.current) {
          return;
        }

        logger.error('❌ Failed to setup message subscription', {
          error,
          communityId,
          conversationId,
          retryCount: retryCountRef.current,
          subscriptionId: currentSubscriptionId,
        });

        // Retry on error if we haven't exceeded max retries
        if (retryCountRef.current < MAX_RETRIES) {
          const oldRetryCount = retryCountRef.current;
          retryCountRef.current++;

          // Calculate exponential backoff delay
          const retryDelay = Math.min(
            RETRY_BASE_DELAY * Math.pow(2, oldRetryCount),
            RETRY_MAX_DELAY,
          );

          retryTimeoutRef.current = setTimeout(() => {
            if (currentSubscriptionId === subscriptionIdRef.current) {
              isSettingUpRef.current = false; // Make sure mutex is released
              setupSubscription(true, false);
            }
          }, retryDelay);
        } else {
          isFailedStateRef.current = true;
          // Schedule a force reset
          retryTimeoutRef.current = setTimeout(() => {
            if (currentSubscriptionId === subscriptionIdRef.current) {
              isSettingUpRef.current = false; // Make sure mutex is released
              setupSubscription(false, true);
            }
          }, 10000);
        }
      }
    },
    [
      supabase,
      queryClient,
      communityId,
      conversationId,
      forceReset,
      onStatusChange,
    ],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isComponentMounted = true;

    // Initial setup with a small delay to ensure everything is ready
    const setupTimeout = setTimeout(() => {
      if (isComponentMounted) {
        setupSubscription(false, false);
      }
    }, 100);

    return () => {
      isComponentMounted = false;

      // Mark this as an intentional disconnection
      isIntentionalDisconnectRef.current = true;

      // Clear setup timeout if still pending
      clearTimeout(setupTimeout);

      // Clear any pending retries and force resets
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      if (forceResetTimeoutRef.current) {
        clearTimeout(forceResetTimeoutRef.current);
        forceResetTimeoutRef.current = null;
      }

      // Immediate cleanup to prevent race conditions
      if (channelRef.current) {
        const channelToCleanup = channelRef.current;
        logger.debug(
          '🧹 Executing immediate cleanup for message subscription (intentional disconnect)',
          {
            communityId,
            conversationId,
          },
        );

        // Clear any existing cleanup timeout
        if (cleanupTimeoutRef.current) {
          clearTimeout(cleanupTimeoutRef.current);
          cleanupTimeoutRef.current = null;
        }

        // Remove channel immediately
        try {
          supabase.removeChannel(channelToCleanup);
          logger.debug('✅ Channel removed successfully during cleanup');
        } catch (error) {
          logger.warn('⚠️ Error removing channel during cleanup:', error);
        }

        // Clear ref after successful removal
        channelRef.current = null;
      }
    };
  }, [setupSubscription, supabase, communityId, conversationId]);
}
