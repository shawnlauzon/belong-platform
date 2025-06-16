import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceFilter } from '@belongnetwork/types';
import { fetchResources } from '../impl/fetchResources';

export function useResources(filters?: ResourceFilter) {
  const result = useQuery<Resource[], Error>({
    queryKey: ['resources', filters],
    queryFn: () => fetchResources(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('📚 useResources: Error fetching resources', { error: result.error });
  }

  return result;
}
