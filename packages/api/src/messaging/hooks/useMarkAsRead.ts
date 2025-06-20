import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { markAsRead } from '../impl/markAsRead';
import { queryKeys } from '../../shared/queryKeys';

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: markAsRead,
    onSuccess: (_, messageId) => {
      // Invalidate all conversations and messages queries
      // since read status affects unread counts
      queryClient.invalidateQueries({ 
        queryKey: ['conversations'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['messages'] 
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