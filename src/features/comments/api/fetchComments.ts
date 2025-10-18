import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { appendQueries, logger } from '@/shared';
import type { Comment, CommentFilter } from '../types';
import { SELECT_COMMENTS_JOIN_AUTHOR, CommentRowJoinAuthor } from '../types';
import { organizeCommentsIntoThreads } from '../transformers';

export async function fetchComments(
  supabase: SupabaseClient<Database>,
  filter?: CommentFilter,
): Promise<Comment[]> {
  logger.debug('💬 API: Fetching comments', filter);
  let query = supabase
    .from('comments')
    .select(SELECT_COMMENTS_JOIN_AUTHOR);

  // Use appendQueries for simple eq filters
  query = appendQueries(query, {
    resource_id: filter?.resourceId,
    shoutout_id: filter?.shoutoutId,
  });

  // Handle parentId with special null logic
  if (filter?.parentId !== undefined) {
    if (filter.parentId === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', filter.parentId);
    }
  }

  // Handle includeDeleted boolean flag
  if (!filter?.includeDeleted) {
    query = query.eq('is_deleted', false);
  }

  query = query.order('created_at', { ascending: true });

  const { data, error } = await query as {
    data: CommentRowJoinAuthor[] | null;
    error: Error | null;
  };

  if (error) {
    throw error;
  }

  if (!data) {
    return [];
  }

  return organizeCommentsIntoThreads(data);
}