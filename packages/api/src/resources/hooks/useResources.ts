import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Resource, ResourceFilter } from '@belongnetwork/types';
import { fetchResources } from '../impl/fetchResources';

export function useResources(filters?: ResourceFilter) {
  return useQuery<Resource[], Error>({
    queryKey: ['resources', filters],
    queryFn: () => fetchResources(filters),
    onError: (error) => {
      logger.error('📚 useResources: Error fetching resources', { error });
    },
  });
}

export function useResource(id: string) {
  return useQuery<Resource | null, Error>({
    queryKey: ['resources', id],
    queryFn: () => {
      if (!id) {
        return Promise.resolve(null);
      }
      return fetchResourceById(id);
    },
    enabled: !!id,
    onError: (error) => {
      logger.error('📚 useResource: Error fetching resource', { id, error });
    },
  });
}
