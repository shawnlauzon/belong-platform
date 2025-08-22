import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { fetchCommentById } from '../api';
import { commentKeys } from '../queries';

export function useComment(id: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: commentKeys.detail(id),
    queryFn: () => fetchCommentById(supabase, id),
    enabled: !!id,
  });
}