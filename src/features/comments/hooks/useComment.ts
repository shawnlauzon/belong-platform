import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchCommentById } from '../api';
import { commentKeys } from '../queries';
import type { Comment } from '../types';

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