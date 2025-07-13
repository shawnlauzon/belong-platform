import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { fetchTodos } from '../api';
import type { TodoSummary, TodoFilter, TodoCounts } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

const SHORT_CACHE_TIME = 2 * 60 * 1000; // 2 minutes - short due to urgency tracking

/**
 * Hook for fetching user todos with optional filtering.
 *
 * This hook provides a personal command center for user commitments,
 * aggregating data from events, resources, shoutouts, and messages.
 * Todos are categorized by urgency and type for different sections.
 *
 * @param filter - Parameters for filtering todos
 * @returns React Query result with todo data and query state
 *
 * @example
 * ```tsx
 * function TodosList() {
 *   const { data: todos, isPending, error } = useTodos({
 *     userId: 'user-123'
 *   });
 *
 *   if (isPending) return <div>Loading todos...</div>;
 *   if (error) return <div>Error loading todos</div>;
 *
 *   return (
 *     <div>
 *       {todos?.map(todo => (
 *         <div key={todo.id}>
 *           <h3>{todo.title}</h3>
 *           <p>{todo.description}</p>
 *           <span className={`urgency-${todo.urgencyLevel}`}>
 *             {todo.urgencyLevel}
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
 *   const { data: urgentTodos } = useTodos({
 *     userId,
 *     section: 'attention',
 *     limit: 10
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Needs Attention ({urgentTodos?.length || 0})</h2>
 *       {urgentTodos?.map(todo => (
 *         <TodoCard key={todo.id} todo={todo} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useTodos(filter: TodoFilter): UseQueryResult<TodoSummary[], Error> {
  const supabase = useSupabase();

  const query = useQuery<TodoSummary[], Error>({
    queryKey: filter.section
      ? queryKeys.todos.bySection(filter.userId, filter.section)
      : queryKeys.todos.byUser(filter.userId),
    queryFn: () => {
      logger.debug('📊 useTodos: Fetching todos', { filter });
      return fetchTodos(supabase, filter);
    },
    staleTime: SHORT_CACHE_TIME,
    enabled: !!filter.userId,
  });

  if (query.error) {
    logger.error('📊 API: Error fetching todos', {
      error: query.error,
      filter,
    });
  }

  return query;
}

/**
 * Hook for fetching todo counts across all sections.
 *
 * Provides summary counts for badge notifications and section headers.
 * Uses the same data as useTodos but returns counts only.
 *
 * @param userId - User ID to fetch todo counts for
 * @returns React Query result with todo counts
 *
 * @example
 * ```tsx
 * function TodoSummary({ userId }) {
 *   const { data: counts, isPending } = useTodoCounts(userId);
 *
 *   if (isPending) return <div>Loading...</div>;
 *
 *   return (
 *     <div>
 *       <h2>Your Todos</h2>
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
export function useTodoCounts(userId: string): UseQueryResult<TodoCounts, Error> {
  const supabase = useSupabase();

  const query = useQuery<TodoCounts, Error>({
    queryKey: queryKeys.todos.counts(userId),
    queryFn: async () => {
      logger.debug('📊 useTodoCounts: Fetching todo counts', { userId });
      
      // Fetch all todos
      const allTodos = await fetchTodos(supabase, { userId });
      
      // Count todos by section
      const now = new Date();
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const counts: TodoCounts = {
        needsAttention: allTodos.filter(a => 
          a.urgencyLevel === 'urgent' || 
          (a.dueDate && a.dueDate < now && a.type !== 'event_upcoming')
        ).length,
        
        inProgress: allTodos.filter(a => 
          a.type === 'resource_accepted' ||
          (a.type === 'event_upcoming' && a.dueDate && a.dueDate >= now && a.dueDate <= oneDayFromNow)
        ).length,
        
        upcoming: allTodos.filter(a => 
          a.type === 'event_upcoming' && 
          a.dueDate && 
          a.dueDate > oneDayFromNow
        ).length,
        
        recent: allTodos.filter(a => 
          a.createdAt >= sevenDaysAgo &&
          ((a.type === 'event_upcoming' && a.dueDate && a.dueDate < now) ||
           (a.type === 'resource_accepted' && a.metadata.status === 'completed'))
        ).length,
        
        unreadMessages: allTodos.filter(a => a.type === 'message_unread').length
      };

      logger.info('📊 API: Successfully calculated todo counts', { counts, userId });
      return counts;
    },
    staleTime: SHORT_CACHE_TIME,
    enabled: !!userId,
  });

  if (query.error) {
    logger.error('📊 API: Error fetching todo counts', {
      error: query.error,
      userId,
    });
  }

  return query;
}