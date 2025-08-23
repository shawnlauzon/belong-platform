import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { MessageListResponse, MessageListFilters } from '../types';
import { MessageWithSender } from '../types/messageRow';
import { transformMessage } from '../transformers';
import { logger } from '../../../shared';

export async function fetchMessages(
  client: SupabaseClient<Database>,
  filters: MessageListFilters
): Promise<MessageListResponse> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;
  const limit = filters.limit || 50;

  let query = client
    .from('messages')
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(*)
    `)
    .eq('conversation_id', filters.conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (filters.cursor) {
    query = query.lt('created_at', filters.cursor);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching messages', { error });
    throw error;
  }

  if (!data) {
    return { messages: [], hasMore: false };
  }

  const hasMore = data.length > limit;
  const messages = data
    .slice(0, limit)
    .map(msg => transformMessage(msg as MessageWithSender, userId))
    .reverse(); // Reverse to get chronological order

  const nextCursor = hasMore && messages.length > 0
    ? messages[0].createdAt.toISOString()
    : undefined;

  return {
    messages,
    hasMore,
    cursor: nextCursor,
  };
}