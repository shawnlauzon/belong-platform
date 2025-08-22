import { QueryObserverResult, useQueries } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { fetchResourceById } from '../api';
import { resourceKeys } from '../queries';

export function useResourcesById(
  resourceIds: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: { [x: string]: any },
) {
  const supabase = useSupabase();

  const query = useQueries({
    queries: resourceIds.map((id) => ({
      queryKey: resourceKeys.detail(id),
      queryFn: () => fetchResourceById(supabase, id),
      ...options,
    })),
    combine: (results: QueryObserverResult[]) => {
      return {
        data: results.map((result: QueryObserverResult) => result.data),
        isPending: results.some((result: QueryObserverResult) => result.isPending),
        isError: results.some((result: QueryObserverResult) => result.isError),
        error: results.find((result: QueryObserverResult) => result.error)?.error || null,
      };
    },
  });

  if (query.error) {
    logger.error('📚 API: Error fetching resources', {
      error: query.error,
      resourceIds,
    });
  }

  return query;
}
