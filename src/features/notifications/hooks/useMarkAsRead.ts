import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { markAsRead } from '../api/markAsRead';
import { notificationKeys } from '../queries';

export function useMarkAsRead() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markAsRead(supabase, notificationId),
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