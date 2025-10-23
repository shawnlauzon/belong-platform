import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger, getAuthIdOrThrow } from '@/shared';
import { updateComment } from '../api';
import { commentKeys } from '../queries';

/**
 * Hook for updating existing comments.
 *
 * This hook provides functionality for updating comment content. Only the comment author
 * can update their comments. Successfully updated comments are marked with `isEdited` flag.
 * Automatically invalidates related queries on successful update.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with update function and state
 *
 * @example
 * ```tsx
 * function EditCommentForm({ comment }: { comment: Comment }) {
 *   const updateComment = useUpdateComment();
 *   const [content, setContent] = useState(comment.content);
 *
 *   const handleSubmit = async () => {
 *     try {
 *       await updateComment.mutateAsync({
 *         id: comment.id,
 *         content
 *       });
 *       console.log('Updated comment');
 *     } catch (error) {
 *       console.error('Failed to update comment:', error);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <textarea value={content} onChange={(e) => setContent(e.target.value)} />
 *       <button onClick={handleSubmit} disabled={updateComment.isPending}>
 *         {updateComment.isPending ? 'Saving...' : 'Save'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useUpdateComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      logger.debug('💬 useUpdateComment: Updating comment', { id, content });
      const userId = await getAuthIdOrThrow(supabase, 'update comment');
      return updateComment(supabase, userId, id, content);
    },
    onSuccess: (comment) => {
      logger.info('💬 useUpdateComment: Successfully updated comment', {
        id: comment.id,
      });

      // Invalidate comment lists and the specific comment
      queryClient.invalidateQueries({ queryKey: commentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: commentKeys.detail(comment.id) });
    },
    onError: (error) => {
      logger.error('💬 useUpdateComment: Failed to update comment', { error });
    },
  });
}