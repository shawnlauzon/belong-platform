import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { NotificationPreferences, NotificationPreferencesUpdate, GroupedNotificationPreferences, groupPreferences } from '../types/notificationPreferences';
import { fetchPreferences, updatePreferences } from '../api';
import { notificationKeys } from '../queries';

export function useNotificationPreferences(
  options?: Partial<UseQueryOptions<NotificationPreferences | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => fetchPreferences(supabase),
    ...options,
  });
}

export function useGroupedNotificationPreferences(
  options?: Partial<UseQueryOptions<GroupedNotificationPreferences | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [...notificationKeys.preferences(), 'grouped'],
    queryFn: async () => {
      const preferences = await fetchPreferences(supabase);
      return preferences ? groupPreferences(preferences) : null;
    },
    ...options,
  });
}

export function useUpdateNotificationPreferences() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferencesUpdate & { user_id: string }) => 
      updatePreferences(supabase, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}