import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { NotificationCounts } from '../types/notificationCounts';
import { fetchNotificationCounts } from '../api/fetchNotificationCounts';
import { notificationKeys } from '../queries';

export function useNotificationCounts(
  options?: Partial<UseQueryOptions<NotificationCounts, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: notificationKeys.counts(),
    queryFn: () => fetchNotificationCounts(supabase),
    refetchInterval: 30000, // Refetch every 30 seconds as backup
    ...options,
  });
}