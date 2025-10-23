import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger } from '@/shared';
import { useCurrentUser } from '@/features/auth';
import { deleteComment } from '../api';
import { commentKeys } from '../queries';
import { resourceKeys } from '@/features/resources/queries';
import { shoutoutKeys } from '@/features/shoutouts/queries';

/**
 * Hook for deleting comments (soft delete).
 *
 * This hook provides functionality for soft-deleting comments. Only the comment author
 * can delete their comments. Deleted comments are marked with `isDeleted` flag and display
 * placeholder text while preserving threading structure. Automatically invalidates related
 * queries including comment lists and parent entity counts.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with delete function and state
 *
 * @example
 * ```tsx
 * function CommentActions({ comment }: { comment: Comment }) {
 *   const deleteComment = useDeleteComment();
 *
 *   const handleDelete = async () => {
 *     if (!confirm('Are you sure you want to delete this comment?')) {
 *       return;
 *     }
 *
 *     try {
 *       await deleteComment.mutateAsync(comment.id);
 *       console.log('Deleted comment');
 *     } catch (error) {
 *       console.error('Failed to delete comment:', error);
 *     }
 *   };
 *
 *   return (
 *     <button
 *       onClick={handleDelete}
 *       disabled={deleteComment.isPending}
 *       className="danger-button"
 *     >
 *       {deleteComment.isPending ? 'Deleting...' : 'Delete'}
 *     </button>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useDeleteComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: (id: string) => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      logger.debug('💬 useDeleteComment: Deleting comment', { id });
      return deleteComment(supabase, currentUser.id, id);
    },
    onSuccess: (comment) => {
      logger.info('💬 useDeleteComment: Successfully deleted comment', {
        id: comment.id,
      });

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
    onError: (error) => {
      logger.error('💬 useDeleteComment: Failed to delete comment', { error });
    },
  });
}