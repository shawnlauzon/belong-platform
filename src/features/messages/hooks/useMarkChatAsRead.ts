import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { conversationKeys, messageKeys } from '../queries';
import { markChatAsRead } from '../api/markChatAsRead';

export function useMarkChatAsRead() {
  const client = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => markChatAsRead(client, communityId),
    onSuccess: (_, communityId) => {
      // Invalidate community chats to update unread status
      queryClient.invalidateQueries({
        queryKey: conversationKeys.communityChats(),
      });

      // Invalidate community messages
      queryClient.invalidateQueries({
        queryKey: messageKeys.communityMessages(communityId),
      });

      // Set community unread count to 0
      queryClient.setQueryData(messageKeys.communityUnreadCount(communityId), 0);

      // Invalidate total community unread count
      queryClient.invalidateQueries({
        queryKey: messageKeys.totalCommunityUnreadCount(),
      });
    },
  });
}