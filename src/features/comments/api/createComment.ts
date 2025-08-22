import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Comment, CommentInput } from '../types';
import { CommentInsertDbData, SELECT_COMMENTS_JOIN_AUTHOR, CommentRowJoinAuthor } from '../types';
import { toDomainComment } from '../transformers';

export async function createComment(
  supabase: SupabaseClient<Database>,
  input: CommentInput,
): Promise<Comment> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('User must be authenticated to create comments');
  }

  // Validate that either resourceId or shoutoutId is provided, but not both
  if ((!input.resourceId && !input.shoutoutId) || (input.resourceId && input.shoutoutId)) {
    throw new Error('Comment must be associated with either a resource or a shoutout');
  }

  // Validate nesting depth - only allow 2 levels of nesting
  if (input.parentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from('comments')
      .select('parent_id')
      .eq('id', input.parentId)
      .single();

    if (parentError) {
      throw new Error('Parent comment not found');
    }

    // If parent comment has a parent, this would create a 3rd level - not allowed
    if (parentComment.parent_id) {
      throw new Error('Comments can only be nested up to 2 levels deep');
    }
  }

  const insertData: CommentInsertDbData = {
    content: input.content,
    author_id: user.id,
    parent_id: input.parentId ?? null,
    resource_id: input.resourceId ?? null,
    shoutout_id: input.shoutoutId ?? null,
  };

  const { data, error } = await supabase
    .from('comments')
    .insert(insertData)
    .select(SELECT_COMMENTS_JOIN_AUTHOR)
    .single() as {
    data: CommentRowJoinAuthor | null;
    error: Error | null;
  };

  if (error || !data) {
    throw error || new Error('Failed to create comment');
  }

  return toDomainComment(data);
}