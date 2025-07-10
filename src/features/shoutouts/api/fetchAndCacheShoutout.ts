import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '../../../shared/types/database';
import { queryKeys } from '../../../shared';
import { fetchShoutoutInfoById } from './fetchShoutoutInfoById';
import type { ShoutoutDetail } from '../types';
import { fetchAndCacheResource } from '../../resources/api';
import { fetchUserById } from '../../users/api';

/**
 * Ensures a consolidated ShoutoutDetail object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param shoutoutId - The shoutout ID to ensure
 * @returns Promise resolving to consolidated ShoutoutDetail object or null if not found
 */
export async function fetchAndCacheShoutout(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  shoutoutId: string,
): Promise<ShoutoutDetail | null> {
  const queryKey = queryKeys.shoutouts.byId(shoutoutId);

  // Check if data is already in cache
  const cachedData = queryClient.getQueryData<ShoutoutDetail>(queryKey);
  if (cachedData) {
    return cachedData;
  }

  // Get shoutout info (lightweight with ID references)
  const shoutoutInfo = await fetchShoutoutInfoById(supabase, shoutoutId);
  if (!shoutoutInfo) return null;

  // Get related entities using cache-aware functions
  const [fromUser, toUser, resource] = await Promise.all([
    fetchUserById(supabase, shoutoutInfo.fromUserId),
    fetchUserById(supabase, shoutoutInfo.toUserId),
    fetchAndCacheResource(supabase, queryClient, shoutoutInfo.resourceId),
  ]);

  if (!fromUser || !toUser || !resource) return null;

  // Return consolidated shoutout
  const result = {
    ...shoutoutInfo,
    fromUserId: shoutoutInfo.fromUserId,
    toUserId: shoutoutInfo.toUserId,
    resourceId: shoutoutInfo.resourceId,
    fromUser,
    toUser,
    resource,
  };

  // Set data in cache
  queryClient.setQueryData(queryKey, result, {
    updatedAt: Date.now(),
  });

  return result;
}