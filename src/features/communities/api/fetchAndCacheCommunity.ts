import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '@/shared/types/database';
import { queryKeys } from '@/shared';
import { fetchCommunityById } from './fetchCommunityById';
import { fetchUserById } from '../../users/api/fetchUserById';
import type { CommunityDetail } from '../types';
import type { UserDetail } from '../../users/types';

/**
 * Ensures a consolidated Community object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param communityId - The community ID to ensure
 * @returns Promise resolving to consolidated Community object or null if not found
 */
export async function fetchAndCacheCommunity(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  communityId: string,
): Promise<CommunityDetail | null> {
  // Check if data is already in cache AND not stale
  const communityQueryKey = queryKeys.communities.byId(communityId);
  const queryState = queryClient.getQueryState(communityQueryKey);
  const cachedCommunity = queryClient.getQueryData<CommunityDetail>(communityQueryKey);
  
  // Only use cached data if it exists and is not stale
  if (cachedCommunity && queryState && !queryState.isInvalidated) {
    return cachedCommunity;
  }

  // Get community info
  const communityInfo = await fetchCommunityById(supabase, communityId);
  if (!communityInfo) return null;

  // Get organizer, checking cache first
  const userQueryKey = queryKeys.users.byId(communityInfo.organizerId);
  let organizer = queryClient.getQueryData<UserDetail>(userQueryKey) ?? null;

  if (!organizer) {
    organizer = await fetchUserById(supabase, communityInfo.organizerId);
    if (!organizer) return null;

    // Cache the user data
    queryClient.setQueryData(userQueryKey, organizer);
  }

  // Return consolidated community
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organizerId, ...communityWithoutId } = communityInfo;
  const result = {
    ...communityWithoutId,
    organizer,
  };

  // Set data in cache
  queryClient.setQueryData(communityQueryKey, result, {
    updatedAt: Date.now(),
  });

  return result;
}
