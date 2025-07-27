import { QueriesOptions, useQueries } from '@tanstack/react-query';
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
  });

  if (query.some((q) => q.error)) {
    logger.error('📚 API: Error fetching resources', {
      error: query.some((q) => q.error),
    });
  }

  return query;
}
