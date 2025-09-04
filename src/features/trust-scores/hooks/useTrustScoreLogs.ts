import { useState, useEffect } from 'react';
import { useSupabase } from '../../../shared/hooks';
import { fetchTrustScoreLogs } from '../api/fetchTrustScoreLogs';
import type { TrustScoreLog } from '../types';
import { trustScoreLogTransformer } from '../transformers/trustScoreLogTransformer';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '../../../shared';
import { getCurrentUserId } from '../../auth/api';

interface UseTrustScoreLogsOptions {
  userId?: string;
  communityId?: string;
  limit?: number;
}

interface UseTrustScoreLogsResult {
  data: TrustScoreLog[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for fetching trust score logs with real-time updates
 *
 * @param options - Configuration options for filtering logs
 * @returns Trust score logs with real-time updates
 */
export function useTrustScoreLogs(
  options: UseTrustScoreLogsOptions = {}
): UseTrustScoreLogsResult {
  const client = useSupabase();
  const [logs, setLogs] = useState<TrustScoreLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { userId, communityId, limit = 50 } = options;

  useEffect(() => {
    if (!client) {
      logger.debug('useTrustScoreLogs: waiting for supabase client');
      return;
    }

    let channel: RealtimeChannel;
    let currentUserId: string;

    const setupRealtimeTrustScoreLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user ID if not provided
        if (userId) {
          currentUserId = userId;
        } else {
          const authUserId = await getCurrentUserId(client);
          if (!authUserId) {
            logger.warn('useTrustScoreLogs: no authenticated user');
            setIsLoading(false);
            return;
          }
          currentUserId = authUserId;
        }

        logger.info('useTrustScoreLogs: initializing trust score log subscription', {
          userId: currentUserId,
          communityId,
          limit,
        });

        // Load initial logs
        logger.debug('useTrustScoreLogs: loading initial trust score logs', {
          userId: currentUserId,
          communityId,
          limit,
        });

        const initialData = await fetchTrustScoreLogs(client, {
          userId: currentUserId,
          communityId,
          limit,
          offset: 0,
        });

        logger.info('useTrustScoreLogs: initial trust score logs loaded', {
          userId: currentUserId,
          communityId,
          logCount: initialData.length,
        });

        // Transform logs
        const transformedLogs = initialData.map(trustScoreLogTransformer);
        setLogs(transformedLogs);
        setIsLoading(false);

        logger.debug('useTrustScoreLogs: setting up realtime subscription', {
          userId: currentUserId,
          channelName: `user:${currentUserId}:trust-logs`,
        });

        // Set up realtime subscription
        let filter = `user_id=eq.${currentUserId}`;
        if (communityId) {
          filter += `,community_id=eq.${communityId}`;
        }

        channel = client
          .channel(`user:${currentUserId}:trust-logs`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'trust_score_logs',
              filter,
            },
            async (payload) => {
              logger.info('useTrustScoreLogs: received new trust score log via realtime', {
                userId: currentUserId,
                logId: payload.new.id,
                actionType: payload.new.action_type,
                pointsChange: payload.new.points_change,
              });

              // Fetch the complete log entry
              const { data } = await client
                .from('trust_score_logs')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              if (data) {
                const newLog = trustScoreLogTransformer(data);

                logger.debug('useTrustScoreLogs: adding new trust score log to state', {
                  logId: newLog.id,
                  actionType: newLog.actionType,
                  pointsChange: newLog.pointsChange,
                  userId: currentUserId,
                });

                // Add new log to the beginning of the list (most recent first)
                setLogs((prev) => [newLog, ...prev]);
              } else {
                logger.warn('useTrustScoreLogs: failed to fetch new trust score log data', {
                  logId: payload.new.id,
                  userId: currentUserId,
                });
              }
            }
          )
          .subscribe();

        logger.info(
          'useTrustScoreLogs: realtime subscription established successfully',
          {
            userId: currentUserId,
            communityId,
            initialLogCount: transformedLogs.length,
          }
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        logger.error('useTrustScoreLogs: failed to setup realtime trust score logs', {
          error,
          userId: currentUserId,
          communityId,
        });
        setError(error);
        setIsLoading(false);
      }
    };

    setupRealtimeTrustScoreLogs();

    return () => {
      if (channel) {
        logger.debug('useTrustScoreLogs: cleaning up realtime subscription', {
          userId: currentUserId,
          channelName: `user:${currentUserId}:trust-logs`,
        });
        client.removeChannel(channel);
      }
    };
  }, [client, userId, communityId, limit]);

  return {
    data: logs,
    isLoading,
    error,
  };
}