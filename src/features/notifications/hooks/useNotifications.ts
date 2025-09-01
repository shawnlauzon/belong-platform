import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { Notification } from '../types/notification';
import { fetchNotifications, type FetchNotificationsFilter } from '../api/fetchNotifications';
import { notificationKeys } from '../queries';

export function useNotifications(
  filter: FetchNotificationsFilter = {},
  options?: Partial<UseInfiniteQueryOptions<Notification[], Error>>
) {
  const supabase = useSupabase();
  const { limit = 20, ...restFilter } = filter;

  return useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam }) => 
      fetchNotifications(supabase, {
        ...restFilter,
        limit,
        offset: (pageParam as number) * limit,
      }),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === limit ? allPages.length : undefined;
    },
    initialPageParam: 0,
    ...options,
  });
}