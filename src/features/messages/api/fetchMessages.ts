import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { MessageListFilters } from '../types';
import { logger } from '../../../shared';

interface MessageBasic {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface RawMessageListResponse {
  messages: MessageBasic[];
  hasMore: boolean;
  cursor?: string;
}

export async function fetchMessages(
  client: SupabaseClient<Database>,
  filters: MessageListFilters
): Promise<RawMessageListResponse> {
  const { error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  // Authentication verified, proceed with message fetch
  const limit = filters.limit || 50;

  let query = client
    .from('messages')
    .select('id, sender_id, content, created_at, updated_at')
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
  const rawMessages = data.slice(0, limit);

  // Note: Messages will be transformed in useMessages with participant data
  const nextCursor = hasMore && rawMessages.length > 0
    ? new Date(rawMessages[0].created_at).toISOString()
    : undefined;

  return {
    messages: rawMessages.reverse(), // Reverse to get chronological order
    hasMore,
    cursor: nextCursor,
  };
}