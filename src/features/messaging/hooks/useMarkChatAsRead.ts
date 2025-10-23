import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { useCurrentUser } from '@/features/auth';
import { communityChatKeys } from '../queries';
import { markChatAsRead } from '../api/markChatAsRead';

export function useMarkChatAsRead() {
  const client = useSupabase();
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (communityId: string) => {
      if (!currentUser) {
        throw new Error('User must be authenticated');
      }
      return markChatAsRead(client, currentUser.id, communityId);
    },
    onSuccess: (_, communityId) => {
      // Invalidate community messages
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.messages(communityId),
      });

      // Set community unread count to 0
      queryClient.setQueryData(communityChatKeys.unreadCount(communityId), 0);

      // Invalidate total community unread count
      queryClient.invalidateQueries({
        queryKey: communityChatKeys.totalUnreadCount(),
      });
    },
  });
}
