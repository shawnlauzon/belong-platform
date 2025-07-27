import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { Resource } from '@/features/resources/types';
import { fetchResourceById } from '../api/fetchResourceById';
import { resourceKeys } from '../queries';
import { STANDARD_CACHE_TIME } from '@/config';

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
 *   const { data: resource, isPending, error } = useResource(resourceId);
 *
 *   if (isPending) return <div>Loading...</div>;
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
 *         <span>Created by: {resource.owner.firstName} {resource.owner.lastName}</span>
 *         <span>Community: {resource.community?.name}</span>
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useResource(
  id: string,
  options?: Partial<UseQueryOptions<Resource | null, Error>>,
) {
  const supabase = useSupabase();

  return useQuery<Resource | null, Error>({
    queryKey: resourceKeys.detail(id),
    queryFn: () => fetchResourceById(supabase, id),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });
}
