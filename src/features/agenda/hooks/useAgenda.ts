import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { fetchAgenda } from '../api';
import type { Agenda } from '../types';
import type { UseQueryResult } from '@tanstack/react-query';

const SHORT_CACHE_TIME = 2 * 60 * 1000; // 2 minutes

/**
 * Hook for fetching current user's agenda.
 *
 * This hook provides a personal command center for user commitments,
 * aggregating data from events, resources, shoutouts, and messages.
 *
 * @returns React Query result with todo data and query state
 *
 * @example
 * ```tsx
 * function AgendaList() {
 *   const { data: agenda, isPending, error } = useAgenda();
 *
 *   if (isPending) return <div>Loading agenda...</div>;
 *   if (error) return <div>Error loading agenda</div>;
 *
 *   return (
 *     <div>
 *       {agenda?.items.map(todo => (
 *         <div key={todo.id}>
 *           <h3>{todo.title}</h3>
 *           <p>{todo.description}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useAgenda(): UseQueryResult<Agenda, Error> {
  const supabase = useSupabase();

  const query = useQuery<Agenda, Error>({
    queryKey: queryKeys.agenda.current,
    queryFn: () => {
      logger.debug('📊 useAgenda: Fetching agenda');
      return fetchAgenda(supabase);
    },
    staleTime: SHORT_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📊 API: Error fetching agenda', {
      error: query.error,
    });
  }

  return query;
}