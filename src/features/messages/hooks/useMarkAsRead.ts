import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { markAsRead } from '../api';
import { messageKeys } from '../queries';

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
        queryKey: messageKeys.conversations(),
      });
      
      // Invalidate unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.unreadCount(),
      });
    },
  });
}