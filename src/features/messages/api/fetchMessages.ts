import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { logger } from '../../../shared';

interface MessageBasic {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface FetchMessagesResponse {
  messages: MessageBasic[];
  hasMore: boolean;
  cursor?: string;
}

export async function fetchMessages(
  client: SupabaseClient<Database>,
  conversationId: string,
  options?: { limit?: number; cursor?: string },
): Promise<FetchMessagesResponse> {
  logger.info('Starting message fetch process', {
    conversationId,
    limit: options?.limit || 50,
    hasCursor: !!options?.cursor,
  });

  // Authentication verified, proceed with message fetch
  const limit = options?.limit || 50;

  let query = client
    .from('messages')
    .select('id, sender_id, content, created_at, updated_at')
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.cursor) {
    logger.debug('Using cursor for paginated message fetch', {
      conversationId,
      cursor: options.cursor,
    });
    query = query.lt('created_at', options.cursor);
  }

  logger.debug('Executing message fetch query', {
    conversationId,
    limit: limit + 1,
    hasCursor: !!options?.cursor,
  });

  const { data, error } = await query;

  if (error) {
    logger.error('Database error while fetching messages', {
      error,
      conversationId,
      limit,
      hasCursor: !!options?.cursor,
    });
    throw error;
  }

  if (!data) {
    logger.warn('No data returned from message fetch query', {
      conversationId,
    });
    return { messages: [], hasMore: false };
  }

  logger.debug('Raw message data retrieved from database', {
    conversationId,
    rawCount: data.length,
    requestedLimit: limit,
  });

  const hasMore = data.length > limit;
  const rawMessages = data.slice(0, limit);

  // Note: Messages will be transformed in useMessages with participant data
  const nextCursor =
    hasMore && rawMessages.length > 0
      ? new Date(rawMessages[0].created_at).toISOString()
      : undefined;

  logger.info('Message fetch process completed successfully', {
    conversationId,
    messageCount: rawMessages.length,
    hasMore,
    hasNextCursor: !!nextCursor,
  });

  return {
    messages: rawMessages.reverse(), // Reverse to get chronological order
    hasMore,
    cursor: nextCursor,
  };
}
