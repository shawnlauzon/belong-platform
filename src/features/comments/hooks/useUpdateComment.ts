import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { updateComment } from '../api';
import { commentKeys } from '../queries';

export function useUpdateComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) => 
      updateComment(supabase, id, content),
    onSuccess: (comment) => {
      // Invalidate comment lists and the specific comment
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commentKeys.detail(comment.id) });
    },
  });
}