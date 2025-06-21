import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createResourceService } from '../services/resource.service';
import type { Resource } from '@belongnetwork/types';

export function useResource(id: string) {
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);
  
  const result = useQuery<Resource | null, Error>({
    queryKey: ['resource', id],
    queryFn: () => resourceService.fetchResourceById(id),
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