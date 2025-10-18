import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { STANDARD_CACHE_TIME } from '@/config';
import type { CommentFilter, Comment } from '../types';
import { fetchComments } from '../api';
import { commentKeys } from '../queries';

/**
 * Hook for fetching comments with optional filtering.
 *
 * This hook provides functionality for retrieving comments for resources or shoutouts
 * with support for threading, soft deletion filtering, and parent/child relationships.
 * Comments are returned organized into threaded conversations.
 * Must be used within a BelongProvider context.
 *
 * @param filter - Optional filters to apply (resourceId, shoutoutId, parentId, includeDeleted)
 * @param options - Optional React Query options to customize behavior
 * @returns React Query result with comment data organized into threads
 *
 * @example
 * ```tsx
 * function ResourceComments({ resourceId }: { resourceId: string }) {
 *   const { data: comments, isPending, isError } = useComments({
 *     resourceId,
 *     includeDeleted: false
 *   });
 *
 *   if (isPending) return <div>Loading comments...</div>;
 *   if (isError) return <div>Error loading comments</div>;
 *
 *   return (
 *     <div>
 *       {comments?.map(comment => (
 *         <CommentThread key={comment.id} comment={comment} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * @category React Hooks
 */
export function useComments(
  filter?: CommentFilter,
  options?: Partial<UseQueryOptions<Comment[], Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: filter ? commentKeys.list(filter) : commentKeys.lists(),
    queryFn: () => fetchComments(supabase, filter),
    enabled: !!(filter?.resourceId || filter?.shoutoutId),
    staleTime: STANDARD_CACHE_TIME,
    ...options,
  });
}