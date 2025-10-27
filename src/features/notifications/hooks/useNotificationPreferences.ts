import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useSupabase } from "../../../shared/hooks/useSupabase";
import type {
  NotificationPreferences,
  TypedNotificationPreferences,
  NotificationPreferencesUpdate,
} from "../types/notificationPreferences";
import {
  fetchPreferences,
  fetchTypedPreferences,
  updatePreferences,
} from "../api";
import { notificationKeys } from "../queries";

/**
 * Hook to fetch notification preferences for the current user
 * Returns the raw database row
 */
export function useNotificationPreferences(
  options?: Partial<UseQueryOptions<NotificationPreferences | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      return fetchPreferences(supabase, user.id);
    },
    ...options,
  });
}

/**
 * Hook to fetch typed notification preferences for the current user
 * Returns preferences with parsed JSONB channel settings
 */
export function useTypedNotificationPreferences(
  options?: Partial<UseQueryOptions<TypedNotificationPreferences | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: [...notificationKeys.preferences(), "typed"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      return fetchTypedPreferences(supabase, user.id);
    },
    ...options,
  });
}

/**
 * Hook to update notification preferences for the current user
 */
export function useUpdateNotificationPreferences() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: NotificationPreferencesUpdate) =>
      updatePreferences(supabase, preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.preferences(),
      });
    },
  });
}
