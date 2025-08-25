import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Comment } from '../types';
import {
  CommentUpdateDbData,
  SELECT_COMMENTS_JOIN_AUTHOR,
  CommentRowJoinAuthor,
} from '../types';
import { toDomainComment } from '../transformers';

async function hasChildComments(
  supabase: SupabaseClient<Database>,
  commentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('comments')
    .select('id')
    .eq('parent_id', commentId)
    .eq('is_deleted', false)
    .limit(1);

  if (error) {
    throw error;
  }

  return data !== null && data.length > 0;
}

export async function deleteComment(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Comment> {
  // Check if this comment has child comments
  const hasChildren = await hasChildComments(supabase, id);
  
  if (hasChildren) {
    throw new Error('Cannot delete comment with replies. Please delete all replies first.');
  }

  // Soft delete the comment
  const updateDate = new Date().toISOString();
  const updateData: CommentUpdateDbData = {
    is_deleted: true,
    content: 'Comment deleted',
    updated_at: updateDate,
  };

  // Now perform the update and select to verify it worked; note
  // we can't see the updated comment since it's soft deleted
  const { data, error } = (await supabase
    .from('comments')
    .update(updateData)
    .eq('id', id)
    .select(SELECT_COMMENTS_JOIN_AUTHOR)
    .maybeSingle()) as {
    data: CommentRowJoinAuthor | null;
    error: Error | null;
  };

  if (!data) {
    throw new Error('Comment not found');
  }

  if (error) {
    throw error;
  }

  return toDomainComment(data);
}
