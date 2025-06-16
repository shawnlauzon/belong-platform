import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Resource } from '@belongnetwork/types';
import { fetchResourceById } from '../impl/fetchResources';

export function useResource(id: string) {
  const result = useQuery<Resource | null, Error>({
    queryKey: ['resource', id],
    queryFn: () => fetchResourceById(id),
    enabled: !!id,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('📚 useResource: Error fetching resource', { 
      id, 
      error: result.error 
    });
  }

  return result;
}