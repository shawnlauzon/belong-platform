import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { fetchActivities } from '../api';
import type { ActivitySummary, ActivityFilter, ActivityCounts } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

const SHORT_CACHE_TIME = 2 * 60 * 1000; // 2 minutes - short due to urgency tracking

/**
 * Hook for fetching user activities with optional filtering.
 *
 * This hook provides a personal command center for user commitments,
 * aggregating data from events, resources, shoutouts, and messages.
 * Activities are categorized by urgency and type for different sections.
 *
 * @param filter - Parameters for filtering activities
 * @returns React Query result with activity data and query state
 *
 * @example
 * ```tsx
 * function ActivitiesList() {
 *   const { data: activities, isPending, error } = useActivities({
 *     userId: 'user-123'
 *   });
 *
 *   if (isPending) return <div>Loading activities...</div>;
 *   if (error) return <div>Error loading activities</div>;
 *
 *   return (
 *     <div>
 *       {activities?.map(activity => (
 *         <div key={activity.id}>
 *           <h3>{activity.title}</h3>
 *           <p>{activity.description}</p>
 *           <span className={`urgency-${activity.urgencyLevel}`}>
 *             {activity.urgencyLevel}
 *           </span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Filter by section
 * function NeedsAttentionSection({ userId }) {
 *   const { data: urgentActivities } = useActivities({
 *     userId,
 *     section: 'attention',
 *     limit: 10
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Needs Attention ({urgentActivities?.length || 0})</h2>
 *       {urgentActivities?.map(activity => (
 *         <ActivityCard key={activity.id} activity={activity} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useActivities(filter: ActivityFilter): UseQueryResult<ActivitySummary[], Error> {
  const supabase = useSupabase();

  const query = useQuery<ActivitySummary[], Error>({
    queryKey: filter.section
      ? queryKeys.activities.bySection(filter.userId, filter.section)
      : queryKeys.activities.byUser(filter.userId),
    queryFn: () => {
      logger.debug('📊 useActivities: Fetching activities', { filter });
      return fetchActivities(supabase, filter);
    },
    staleTime: SHORT_CACHE_TIME,
    enabled: !!filter.userId,
  });

  if (query.error) {
    logger.error('📊 API: Error fetching activities', {
      error: query.error,
      filter,
    });
  }

  return query;
}

/**
 * Hook for fetching activity counts across all sections.
 *
 * Provides summary counts for badge notifications and section headers.
 * Uses the same data as useActivities but returns counts only.
 *
 * @param userId - User ID to fetch activity counts for
 * @returns React Query result with activity counts
 *
 * @example
 * ```tsx
 * function ActivitySummary({ userId }) {
 *   const { data: counts, isPending } = useActivityCounts(userId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <h2>Your Activities</h2>
 *       <div>Needs Attention: {counts?.needsAttention || 0}</div>
 *       <div>In Progress: {counts?.inProgress || 0}</div>
 *       <div>Upcoming: {counts?.upcoming || 0}</div>
 *       <div>Recent: {counts?.recent || 0}</div>
 *       {counts?.unreadMessages > 0 && (
 *         <div>Unread Messages: {counts.unreadMessages}</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useActivityCounts(userId: string): UseQueryResult<ActivityCounts, Error> {
  const supabase = useSupabase();

  const query = useQuery<ActivityCounts, Error>({
    queryKey: queryKeys.activities.counts(userId),
    queryFn: async () => {
      logger.debug('📊 useActivityCounts: Fetching activity counts', { userId });
      
      // Fetch all activities
      const allActivities = await fetchActivities(supabase, { userId });
      
      // Count activities by section
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const counts: ActivityCounts = {
        needsAttention: allActivities.filter(a => 
          a.urgencyLevel === 'urgent' || 
          (a.dueDate && a.dueDate < now && a.type !== 'event_upcoming')
        ).length,
        
        inProgress: allActivities.filter(a => 
          a.type === 'resource_accepted' ||
          (a.type === 'event_upcoming' && a.dueDate && a.dueDate >= now && a.dueDate <= oneDayFromNow)
        ).length,
        
        upcoming: allActivities.filter(a => 
          a.type === 'event_upcoming' && 
          a.dueDate && 
          a.dueDate > oneDayFromNow
        ).length,
        
        recent: allActivities.filter(a => 
          a.createdAt >= sevenDaysAgo &&
          ((a.type === 'event_upcoming' && a.dueDate && a.dueDate < now) ||
           (a.type === 'resource_accepted' && a.metadata.status === 'completed'))
        ).length,
        
        unreadMessages: allActivities.filter(a => a.type === 'message_unread').length
      };

      logger.info('📊 API: Successfully calculated activity counts', { counts, userId });
      return counts;
    },
    staleTime: SHORT_CACHE_TIME,
    enabled: !!userId,
  });

  if (query.error) {
    logger.error('📊 API: Error fetching activity counts', {
      error: query.error,
      userId,
    });
  }

  return query;
}