import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { markAllAsRead } from '../api/markAllAsRead';
import { notificationKeys } from '../queries';

export function useMarkAllAsRead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllAsRead(supabase),
    onSuccess: () => {
      // Invalidate notification lists and counts
      queryClient.invalidateQueries({
        queryKey: notificationKeys.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.counts(),
      });
    },
  });
}