import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createMessagingService } from '../services/messaging.service';
import { queryKeys } from '../../shared/queryKeys';

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  const supabase = useSupabase();
  const messagingService = createMessagingService(supabase);

  return useMutation<void, Error, string>({
    mutationFn: (messageId) => messagingService.markAsRead(messageId),
    onSuccess: (_, messageId) => {
      // Invalidate all conversations and messages queries
      // since read status affects unread counts
      queryClient.invalidateQueries({ 
        queryKey: ['user', 'conversations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['messaging', 'messages'] 
      });

      logger.info('💬 useMarkAsRead: Successfully marked message as read', {
        messageId,
      });
    },
    onError: (error) => {
      logger.error('💬 useMarkAsRead: Failed to mark message as read', { error });
    },
  });
}