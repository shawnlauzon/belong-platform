import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '@/shared/types/database';
import { queryKeys } from '@/shared';
import { fetchCommunityById } from './fetchCommunityById';
import { fetchUserById } from '../../users/api/fetchUserById';
import type { Community } from '../types';
import type { User } from '../../users/types';

/**
 * Ensures a consolidated Community object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param communityId - The community ID to ensure
 * @returns Promise resolving to consolidated Community object or null if not found
 */
export async function fetchAndConsolidateCommunity(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  communityId: string,
): Promise<Community | null> {
  console.log(
    '🔍 fetchAndConsolidateCommunity called with communityId:',
    communityId,
  );

  // Check if data is already in cache
  const communityQueryKey = queryKeys.communities.byId(communityId);
  const cachedCommunity =
    queryClient.getQueryData<Community>(communityQueryKey);
  if (cachedCommunity) {
    console.log('📋 Using cached data for communityId:', communityId);
    return cachedCommunity;
  }

  console.log(
    '🚀 fetchAndConsolidateCommunity queryFn executing for communityId:',
    communityId,
  );

  // Get community info
  const communityInfo = await fetchCommunityById(supabase, communityId);
  console.log('📄 fetchCommunityById result:', communityInfo);
  if (!communityInfo) return null;

  // Get organizer, checking cache first
  const userQueryKey = queryKeys.users.byId(communityInfo.organizerId);
  let organizer = queryClient.getQueryData<User>(userQueryKey) ?? null;

  if (!organizer) {
    console.log('👤 Organizer not in cache, fetching from API');
    organizer = await fetchUserById(supabase, communityInfo.organizerId);
    console.log('👤 fetchUserById result:', organizer);
    if (!organizer) return null;

    // Cache the user data
    queryClient.setQueryData(userQueryKey, organizer);
  } else {
    console.log('👤 Using cached organizer data');
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
