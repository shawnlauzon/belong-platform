import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Comment } from '../types';
import { SELECT_COMMENTS_JOIN_AUTHOR, CommentRowJoinAuthor } from '../types';
import { toDomainComment } from '../transformers';

export async function fetchCommentById(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Comment | null> {
  const { data, error } = await supabase
    .from('comments')
    .select(SELECT_COMMENTS_JOIN_AUTHOR)
    .eq('id', id)
    .single() as {
    data: CommentRowJoinAuthor | null;
    error: Error | null;
  };

  if (error || !data) {
    return null;
  }

  return toDomainComment(data);
}