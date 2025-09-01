import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { NotificationPreferences, NotificationPreferencesUpdate } from '../types/notificationPreferences';
import { updatePreferences } from '../api/updatePreferences';
import { notificationKeys } from '../queries';

export function useNotificationPreferences(
  options?: Partial<UseQueryOptions<NotificationPreferences | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data;
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