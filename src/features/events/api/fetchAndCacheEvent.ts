import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '@/shared/types/database';
import { queryKeys } from '@/shared';
import { fetchEventInfoById } from './fetchEventInfoById';
import type { EventDetail } from '../types';
import { fetchAndCacheCommunity } from '@/features/communities/api';
import { fetchUserById } from '@/features/users/api';

/**
 * Ensures a consolidated Event object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param eventId - The event ID to ensure
 * @returns Promise resolving to consolidated Event object or null if not found
 */
export async function fetchAndCacheEvent(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  eventId: string,
): Promise<EventDetail | null> {
  const queryKey = queryKeys.events.byId(eventId);

  // Check if data is already in cache
  const cachedData = queryClient.getQueryData<EventDetail>(queryKey);
  if (cachedData) {
    return cachedData;
  }

  // Get event info
  const eventInfo = await fetchEventInfoById(supabase, eventId);
  if (!eventInfo) return null;

  // Get organizer and community using ensure functions
  const [organizer, community] = await Promise.all([
    fetchUserById(supabase, eventInfo.organizerId),
    fetchAndCacheCommunity(supabase, queryClient, eventInfo.communityId),
  ]);

  if (!organizer || !community) return null;

  // Return consolidated event
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { organizerId, communityId, ...eventWithoutIds } = eventInfo;
  const result = {
    ...eventWithoutIds,
    organizer,
    community,
  };

  // Set data in cache
  queryClient.setQueryData(queryKey, result, {
    updatedAt: Date.now(),
  });

  return result;
}
