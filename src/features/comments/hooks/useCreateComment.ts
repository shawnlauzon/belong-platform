import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase, logger, getAuthIdOrThrow } from '@/shared';
import type { CommentInput } from '../types';
import { createComment } from '../api';
import { commentKeys } from '../queries';
import { resourceKeys } from '@/features/resources/queries';
import { shoutoutKeys } from '@/features/shoutouts/queries';

/**
 * Hook for creating new comments.
 *
 * This hook provides functionality for creating comments on resources or shoutouts
 * with support for threading (parent/child relationships). Automatically invalidates
 * related queries on successful creation including comment lists and parent entity counts.
 * Must be used within a BelongProvider context.
 *
 * @returns React Query mutation result with create function and state
 *
 * @example
 * ```tsx
 * function CommentForm({ resourceId }: { resourceId: string }) {
 *   const createComment = useCreateComment();
 *
 *   const handleSubmit = async (content: string) => {
 *     try {
 *       const newComment = await createComment.mutateAsync({
 *         resourceId,
 *         content
 *       });
 *       console.log('Created comment:', newComment.id);
 *     } catch (error) {
 *       console.error('Failed to create comment:', error);
 *     }
 *   };
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       const formData = new FormData(e.currentTarget);
 *       handleSubmit(formData.get('content') as string);
 *     }}>
 *       <textarea name="content" placeholder="Add a comment..." required />
 *       <button type="submit" disabled={createComment.isPending}>
 *         {createComment.isPending ? 'Posting...' : 'Post Comment'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useCreateComment() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CommentInput) => {
      logger.debug('💬 useCreateComment: Creating comment', { input });
      const userId = await getAuthIdOrThrow(supabase, 'create comment');
      return createComment(supabase, userId, input);
    },
    onSuccess: (comment) => {
      logger.info('💬 useCreateComment: Successfully created comment', {
        id: comment.id,
        resourceId: comment.resourceId,
        shoutoutId: comment.shoutoutId,
        parentId: comment.parentId,
      });

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
    onError: (error) => {
      logger.error('💬 useCreateComment: Failed to create comment', { error });
    },
  });
}