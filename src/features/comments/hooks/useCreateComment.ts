import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { CommentInput } from '../types';
import { createComment } from '../api';
import { commentKeys } from '../queries';
import { resourceKeys } from '@/features/resources/queries';
import { shoutoutKeys } from '@/features/shoutouts/queries';

export function useCreateComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CommentInput) => createComment(supabase, input),
    onSuccess: (comment) => {
      // Invalidate comment lists
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
      
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