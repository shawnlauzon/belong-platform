import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from './useSupabase';
import { logger } from '../logger';

export interface UnreadCounts {
  notifications: number;
  directMessages: number;
  communityMessages: number;
  messagesByConversation: Record<string, number>;
}

/**
 * Hook for fetching unified unread counts for notifications and messages.
 * 
 * Provides a single source of truth for all badge counts in the application.
 * 
 * @param options - Optional React Query options
 * @returns Query state for unread counts
 * 
 * @example
 * ```tsx
 * function AppBadge() {
 *   const { data: counts, isLoading } = useUnreadCounts();
 *   
 *   if (isLoading || !counts) return null;
 *   
 *   const totalMessages = counts.directMessages + counts.communityMessages;
 *   
 *   return (
 *     <div>
 *       <NotificationBell count={counts.notifications} />
 *       <DirectMessageIcon count={counts.directMessages} />
 *       <CommunityMessageIcon count={counts.communityMessages} />
 *       <AppBadge count={counts.notifications + totalMessages} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useUnreadCounts(
  options?: Partial<UseQueryOptions<UnreadCounts, Error>>
) {
  const supabase = useSupabase();

  const query = useQuery<UnreadCounts, Error>({
    queryKey: ['unreadCounts'],
    queryFn: async () => {
      try {
        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData?.user) {
          logger.warn('useUnreadCounts: No authenticated user', { error: userError });
          return {
            notifications: 0,
            directMessages: 0,
            communityMessages: 0,
            messagesByConversation: {},
          };
        }

        const userId = userData.user.id;

        // Fetch notification count
        const { data: notificationData, error: notificationError } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);

        if (notificationError) {
          logger.error('useUnreadCounts: Failed to fetch notification count', {
            error: notificationError,
            userId,
          });
        }

        const notificationCount = notificationData ? notificationData.length : 0;

        // Fetch message counts by conversation with conversation type
        const { data: messageData, error: messageError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id, 
            unread_count,
            conversations!inner(conversation_type)
          `)
          .eq('user_id', userId)
          .gt('unread_count', 0);

        if (messageError) {
          logger.error('useUnreadCounts: Failed to fetch message counts', {
            error: messageError,
            userId,
          });
        }

        const messagesByConversation = (messageData || []).reduce(
          (map, participant) => {
            map[participant.conversation_id] = participant.unread_count;
            return map;
          },
          {} as Record<string, number>
        );

        // Separate counts by conversation type
        let directMessageCount = 0;
        let communityMessageCount = 0;

        (messageData || []).forEach((participant) => {
          const conversationType = participant.conversations?.conversation_type;
          if (conversationType === 'direct') {
            directMessageCount += participant.unread_count;
          } else if (conversationType === 'community') {
            communityMessageCount += participant.unread_count;
          }
        });

        const result = {
          notifications: notificationCount,
          directMessages: directMessageCount,
          communityMessages: communityMessageCount,
          messagesByConversation,
        };

        logger.debug('useUnreadCounts: Counts fetched', {
          ...result,
          userId,
        });

        return result;
      } catch (error) {
        logger.error('useUnreadCounts: Unexpected error', { error });
        return {
          notifications: 0,
          directMessages: 0,
          communityMessages: 0,
          messagesByConversation: {},
        };
      }
    },
    enabled: !!supabase,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Backup polling every minute
    ...options,
  });

  if (query.error) {
    logger.error('useUnreadCounts: Query error', {
      error: query.error,
    });
  }

  return query;
}