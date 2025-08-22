import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { deleteComment } from '../api';
import { commentKeys } from '../queries';
import { resourceKeys } from '@/features/resources/queries';
import { shoutoutKeys } from '@/features/shoutouts/queries';

export function useDeleteComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteComment(supabase, id),
    onSuccess: (comment) => {
      // Invalidate comment lists and the specific comment
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commentKeys.detail(comment.id) });
      
      // Invalidate the specific resource or shoutout to update comment count
      if (comment.resourceId) {
        queryClient.invalidateQueries({ 
          queryKey: resourceKeys.detail(comment.resourceId) 
        });
      }
      if (comment.shoutoutId) {
        queryClient.invalidateQueries({ 
          queryKey: shoutoutKeys.detail(comment.shoutoutId) 
        });
      }
    },
  });
}