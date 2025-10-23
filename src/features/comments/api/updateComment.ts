import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Comment } from '../types';
import { CommentUpdateDbData, SELECT_COMMENTS_JOIN_AUTHOR, CommentRowJoinAuthor } from '../types';
import { toDomainComment } from '../transformers';

export async function updateComment(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  content: string,
): Promise<Comment> {
  const updateData: CommentUpdateDbData = {
    content,
    is_edited: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('comments')
    .update(updateData)
    .eq('id', id)
    .eq('author_id', userId) // Only author can update their comment
    .select(SELECT_COMMENTS_JOIN_AUTHOR)
    .single() as {
    data: CommentRowJoinAuthor | null;
    error: Error | null;
  };

  if (error || !data) {
    throw error || new Error('Failed to update comment');
  }

  return toDomainComment(data);
}