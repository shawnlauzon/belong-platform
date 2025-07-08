import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '@/shared/types/database';
import { queryKeys } from '@/shared';
import { fetchResourceInfoById } from './fetchResourceInfoById';
import type { ResourceDetail } from '../types';
import { fetchAndCacheCommunity } from '@/features/communities/api';
import { fetchUserById } from '@/features/users/api';

/**
 * Ensures a consolidated Resource object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param resourceId - The resource ID to ensure
 * @returns Promise resolving to consolidated Resource object or null if not found
 */
export async function fetchAndCacheResource(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  resourceId: string,
): Promise<ResourceDetail | null> {
  const queryKey = queryKeys.resources.byId(resourceId);

  // Check if data is already in cache
  const cachedData = queryClient.getQueryData<ResourceDetail>(queryKey);
  if (cachedData) {
    return cachedData;
  }

  // Get resource info
  const resourceInfo = await fetchResourceInfoById(supabase, resourceId);
  if (!resourceInfo) return null;

  // Get owner and community using ensure functions
  const [owner, community] = await Promise.all([
    fetchUserById(supabase, resourceInfo.ownerId),
    fetchAndCacheCommunity(supabase, queryClient, resourceInfo.communityId),
  ]);

  if (!owner || !community) return null;

  // Return consolidated resource
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { ownerId, communityId, ...resourceWithoutIds } = resourceInfo;
  const result = {
    ...resourceWithoutIds,
    owner,
    community,
  };

  // Set data in cache
  queryClient.setQueryData(queryKey, result, {
    updatedAt: Date.now(),
  });

  return result;
}
