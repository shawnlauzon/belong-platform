import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createResourceService } from '../services/resource.service';
import { STANDARD_CACHE_TIME } from '../../../config';

import type { Resource } from '../types';

/**
 * Hook for fetching a single resource by ID.
 *
 * Provides detailed resource information including creator and community data.
 *
 * @param id - The resource ID to fetch
 * @returns Query state for the resource
 *
 * @example
 * ```tsx
 * function ResourceDetail({ resourceId }) {
 *   const { data: resource, isLoading, error } = useResource(resourceId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   if (!resource) return <div>Resource not found</div>;
 *
 *   return (
 *     <div>
 *       <h1>{resource.title}</h1>
 *       <p>{resource.description}</p>
 *       <div>
 *         <span>Type: {resource.type}</span>
 *         <span>Category: {resource.category}</span>
 *       </div>
 *       <div>
 *         <span>Created by: {resource.creator.firstName} {resource.creator.lastName}</span>
 *         <span>Community: {resource.community.name}</span>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useResource(id: string) {
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);

  const query = useQuery<Resource | null, Error>({
    queryKey: queryKeys.resources.byId(id),
    queryFn: () => resourceService.fetchResourceById(id),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!id,
  });

  if (query.error) {
    logger.error('📚 API: Error fetching resource', {
      error: query.error,
      resourceId: id,
    });
  }

  return query.data ?? null;
}
