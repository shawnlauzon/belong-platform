import { useQuery } from '@tanstack/react-query';
import { logger, queryKeys, toRecords } from '../../../shared';
import { useSupabase } from '../../../shared';
import { createResourceService } from '../services/resource.service';
import { STANDARD_CACHE_TIME } from '../../../config';

import type { ResourceInfo, ResourceFilter } from '../types';

/**
 * Hook for fetching resources list.
 *
 * Provides resource listing functionality with optional filtering.
 * Supports filtering by type, category, community, and active status.
 *
 * @param filters - Optional filters to apply to the resource list
 * @returns Query state for resources list
 *
 * @example
 * ```tsx
 * function ResourceList() {
 *   const { data: resources, isLoading, error } = useResources();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {resources?.map(resource => (
 *         <div key={resource.id}>
 *           <h3>{resource.title}</h3>
 *           <p>{resource.description}</p>
 *           <span>{resource.type} - {resource.category}</span>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With filters
 * function CommunityOffers({ communityId }) {
 *   const { data: offers } = useResources({
 *     communityId,
 *     type: 'offer',
 *     isActive: true
 *   });
 *
 *   return (
 *     <div>
 *       <h2>Available Offers ({offers?.length || 0})</h2>
 *       {offers?.map(offer => (
 *         <OfferCard key={offer.id} resource={offer} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useResources(filters?: ResourceFilter) {
  const supabase = useSupabase();
  const resourceService = createResourceService(supabase);

  const query = useQuery<ResourceInfo[], Error>({
    queryKey: filters
      ? queryKeys.resources.filtered(toRecords(filters))
      : queryKeys.resources.all,
    queryFn: () => resourceService.fetchResources(filters),
    staleTime: STANDARD_CACHE_TIME,
  });

  if (query.error) {
    logger.error('📚 API: Error fetching resources', {
      error: query.error,
      filters,
    });
  }

  return query.data ?? [];
}
