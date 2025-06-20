import { getBelongClient } from '@belongnetwork/core';
import type { MessageInfo, MessageFilter } from '@belongnetwork/types';
import { toMessageInfo } from './messageTransformer';

export async function fetchMessages(
  conversationId: string,
  filters?: MessageFilter
): Promise<MessageInfo[]> {
  const { supabase, logger } = getBelongClient();

  logger.debug('💬 API: Fetching messages', { conversationId, filters });

  try {
    let query = supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Apply filters if provided
    if (filters) {
      if (filters.since) {
        query = query.gte('created_at', filters.since.toISOString());
      }

      if (filters.page !== undefined && filters.pageSize !== undefined) {
        const start = filters.page * filters.pageSize;
        const end = start + filters.pageSize - 1;
        query = query.range(start, end);
      }
    }

    const { data, error } = await query;

    if (error) {
      logger.error('💬 API: Failed to fetch messages', { error, conversationId });
      throw error;
    }

    if (!data) {
      return [];
    }

    // Transform to MessageInfo objects
    const messages = data.map(dbMessage => toMessageInfo(dbMessage));

    logger.debug('💬 API: Successfully fetched messages', {
      conversationId,
      count: messages.length,
    });

    return messages;
  } catch (error) {
    logger.error('💬 API: Error fetching messages', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      conversationId,
    });
    throw error;
  }
}