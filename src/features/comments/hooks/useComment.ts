import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchCommentById } from '../api';
import { commentKeys } from '../queries';
import type { Comment } from '../types';

/**
 * Hook for fetching a single comment by ID.
 *
 * This hook retrieves a specific comment including author details and threading information.
 * The query is automatically enabled when a valid ID is provided.
 * Must be used within a BelongProvider context.
 *
 * @param id - The comment ID to fetch
 * @param options - Optional React Query options to customize behavior
 * @returns React Query result with comment data or null if not found
 *
 * @example
 * ```tsx
 * function CommentDetail({ commentId }: { commentId: string }) {
 *   const { data: comment, isPending, isError } = useComment(commentId);
 *
 *   if (isPending) return <div>Loading comment...</div>;
 *   if (isError) return <div>Error loading comment</div>;
 *   if (!comment) return <div>Comment not found</div>;
 *
 *   return (
 *     <div>
 *       <p><strong>{comment.author.fullName}</strong></p>
 *       <p>{comment.content}</p>
 *       {comment.isEdited && <span>(edited)</span>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useComment(
  id: string,
  options?: Partial<UseQueryOptions<Comment | null, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: commentKeys.detail(id),
    queryFn: () => fetchCommentById(supabase, id),
    enabled: !!id,
    ...options,
  });
}