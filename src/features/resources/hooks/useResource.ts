import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys } from '@/shared';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchResourceById } from '@/features/resources/api';
import { useUser } from '@/features/users';
import { useCommunity } from '@/features/communities';

import type { Resource, ResourceInfo } from '@/features/resources/types';

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

  // Fetch the ResourceInfo (with only IDs)
  const resourceQuery = useQuery<ResourceInfo | null, Error>({
    queryKey: queryKeys.resources.byId(id),
    queryFn: () => fetchResourceById(supabase, id),
    staleTime: STANDARD_CACHE_TIME,
    enabled: !!id,
  });

  // Fetch the owner User data
  const ownerQuery = useUser(resourceQuery.data?.ownerId || '');
  
  // Fetch the community data if available
  const communityQuery = useCommunity(resourceQuery.data?.communityId || '');

  if (resourceQuery.error) {
    logger.error('📚 API: Error fetching resource', {
      error: resourceQuery.error,
      resourceId: id,
    });
  }

  // Compose the full Resource object
  if (!resourceQuery.data || !ownerQuery) {
    return null;
  }

  const resource: Resource = {
    ...resourceQuery.data,
    owner: ownerQuery,
    community: communityQuery || undefined,
  };

  return resource;
}
