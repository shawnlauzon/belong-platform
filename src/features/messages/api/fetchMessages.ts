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
  logger.info('Starting message fetch process', {
    conversationId: filters.conversationId,
    limit: filters.limit || 50,
    hasCursor: !!filters.cursor
  });

  const { error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Message fetch failed: user authentication error', { 
      error: userError,
      conversationId: filters.conversationId 
    });
    throw userError;
  }

  logger.debug('User authentication verified for message fetch', {
    conversationId: filters.conversationId
  });

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
    logger.debug('Using cursor for paginated message fetch', {
      conversationId: filters.conversationId,
      cursor: filters.cursor
    });
    query = query.lt('created_at', filters.cursor);
  }

  logger.debug('Executing message fetch query', {
    conversationId: filters.conversationId,
    limit: limit + 1,
    hasCursor: !!filters.cursor
  });

  const { data, error } = await query;

  if (error) {
    logger.error('Database error while fetching messages', { 
      error,
      conversationId: filters.conversationId,
      limit,
      hasCursor: !!filters.cursor
    });
    throw error;
  }

  if (!data) {
    logger.warn('No data returned from message fetch query', {
      conversationId: filters.conversationId
    });
    return { messages: [], hasMore: false };
  }

  logger.debug('Raw message data retrieved from database', {
    conversationId: filters.conversationId,
    rawCount: data.length,
    requestedLimit: limit
  });

  const hasMore = data.length > limit;
  const rawMessages = data.slice(0, limit);

  // Note: Messages will be transformed in useMessages with participant data
  const nextCursor = hasMore && rawMessages.length > 0
    ? new Date(rawMessages[0].created_at).toISOString()
    : undefined;

  logger.info('Message fetch process completed successfully', {
    conversationId: filters.conversationId,
    messageCount: rawMessages.length,
    hasMore,
    hasNextCursor: !!nextCursor
  });

  return {
    messages: rawMessages.reverse(), // Reverse to get chronological order
    hasMore,
    cursor: nextCursor,
  };
}