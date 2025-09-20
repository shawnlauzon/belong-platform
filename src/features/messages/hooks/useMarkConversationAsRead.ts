import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { messageKeys } from '../queries';
import { markAsRead } from '../api/markAsRead';

export function useMarkAsRead() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => markAsRead(client, conversationId),
    onSuccess: (_, conversationId) => {
      // Invalidate conversation to update unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });

      // Invalidate conversations list
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversationList(),
      });

      // Invalidate unread count for this conversation
      queryClient.setQueryData(messageKeys.unreadCount(conversationId), 0);

      // Invalidate total unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.totalUnreadCount(),
      });
    },
  });
}
