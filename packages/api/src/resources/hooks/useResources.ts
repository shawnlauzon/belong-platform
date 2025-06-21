import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createResourceService } from '../services/resource.service';
import type { ResourceInfo, ResourceFilter } from '@belongnetwork/types';

export function useResources(filters?: ResourceFilter) {
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);
  
  const result = useQuery<ResourceInfo[], Error>({
    queryKey: ['resources', filters],
    queryFn: () => resourceService.fetchResources(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('📚 useResources: Error fetching resources', { error: result.error });
  }

  return result;
}
