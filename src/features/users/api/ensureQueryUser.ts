import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { Database } from '@/shared/types/database';
import { queryKeys } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import { fetchUserById } from './fetchUserById';
import type { User } from '../types';

/**
 * Ensures a User object is available, using cache when possible.
 *
 * @param supabase - Supabase client instance
 * @param queryClient - React Query client for cache management
 * @param userId - The user ID to ensure
 * @returns Promise resolving to User object or null if not found
 */
export async function ensureQueryUser(
  supabase: SupabaseClient<Database>,
  queryClient: QueryClient,
  userId: string,
): Promise<User | null> {
  return queryClient.ensureQueryData({
    queryKey: queryKeys.users.byId(userId),
    queryFn: () => fetchUserById(supabase, userId),
    staleTime: STANDARD_CACHE_TIME,
  });
}
