import { QueriesOptions, QueriesResults, useQueries } from '@tanstack/react-query';
import { logger, useSupabase } from '@/shared';
import { fetchResourceById } from '../api';
import type { Resource } from '../types';
import { resourceKeys } from '../queries';

export function useResourcesById(
  resourceIds: string[],
  options?: Partial<QueriesOptions<Resource[]>>,
) {
  const supabase = useSupabase();

  const query = useQueries({
    queries: resourceIds.map((id) => ({
      queryKey: resourceKeys.detail(id),
      queryFn: () => fetchResourceById(supabase, id),
      ...options,
    })),
    combine: (results: QueriesResults<Resource[]>) => {
      return {
        data: results.map((result: QueriesResults<Resource>) => result.data),
        isPending: results.some((result: QueriesResults<Resource>) => result.isPending),
        isError: results.some((result: QueriesResults<Resource>) => result.isError),
        error: results.some((result: QueriesResults<Resource>) => result.error),
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
