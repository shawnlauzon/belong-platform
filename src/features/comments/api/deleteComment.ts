import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Comment } from '../types';
import {
  CommentUpdateDbData,
  SELECT_COMMENTS_JOIN_AUTHOR,
  CommentRowJoinAuthor,
} from '../types';
import { toDomainComment } from '../transformers';

export async function deleteComment(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Comment> {
  // First, get the comment data before deleting it
  const { data: commentBeforeDelete, error: fetchError } = (await supabase
    .from('comments')
    .select(SELECT_COMMENTS_JOIN_AUTHOR)
    .eq('id', id)
    .single()) as {
    data: CommentRowJoinAuthor | null;
    error: Error | null;
  };

  if (fetchError || !commentBeforeDelete) {
    throw fetchError || new Error('Comment not found');
  }

  // Soft delete the comment
  const updateDate = new Date().toISOString();
  const updateData: CommentUpdateDbData = {
    is_deleted: true,
    updated_at: updateDate,
  };

  // Now perform the update and select to verify it worked
  const { data: updatedComment, error } = await supabase
    .from('comments')
    .update(updateData)
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    // If we get a PGRST116 error, it means no rows were updated (RLS blocked it)
    if (error.code === 'PGRST116') {
      throw new Error('You do not have permission to delete this comment');
    }
    throw error;
  }

  // If we didn't get any data back, the update was blocked
  if (!updatedComment) {
    throw new Error('You do not have permission to delete this comment');
  }

  // Return the comment with updated is_deleted status
  const deletedComment = {
    ...commentBeforeDelete,
    is_deleted: true,
    updated_at: updateDate,
  };

  return toDomainComment(deletedComment);
}
