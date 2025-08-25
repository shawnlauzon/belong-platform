import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import type { CommentFilter, Comment } from '../types';
import { fetchComments } from '../api';
import { commentKeys } from '../queries';

export function useComments(
  filter: CommentFilter,
  options?: Partial<UseQueryOptions<Comment[], Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: commentKeys.list(filter),
    queryFn: () => fetchComments(supabase, filter),
    enabled: !!(filter.resourceId || filter.shoutoutId),
    ...options,
  });
}