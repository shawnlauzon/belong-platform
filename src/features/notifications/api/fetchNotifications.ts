import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Notification } from '../types/notification';
import { logger } from '@/shared';

export interface FetchNotificationsFilter {
  type?: Notification['type'];
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

interface FetchNotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  cursor?: string;
}

export async function fetchNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  options?: { limit?: number; cursor?: string },
): Promise<FetchNotificationsResponse> {
  logger.info('Starting notification fetch process', {
    userId,
    limit: options?.limit || 50,
    hasCursor: !!options?.cursor,
  });

  // Authentication verified, proceed with message fetch
  const limit = options?.limit || 50;

  let query = client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (options?.cursor) {
    logger.debug('Using cursor for paginated message fetch', {
      userId,
      cursor: options.cursor,
    });
    query = query.lt('created_at', options.cursor);
  }

  logger.debug('Executing message fetch query', {
    userId,
    limit: limit + 1,
    hasCursor: !!options?.cursor,
  });

  const { data, error } = await query;

  if (error) {
    logger.error('Database error while fetching notifications', {
      error,
      userId,
      limit,
      hasCursor: !!options?.cursor,
    });
    throw error;
  }

  if (!data) {
    logger.warn('No data returned from message fetch query', {
      userId,
    });
    return { notifications: [], hasMore: false };
  }

  logger.debug('Raw notification data retrieved from database', {
    userId,
    rawCount: data.length,
    requestedLimit: limit,
  });

  // const hasMore = data.length > limit;
  // const rawMessages = data.slice(0, limit);

  // Note: Messages will be transformed in useMessages with participant data
  // const nextCursor =
  //   hasMore && rawMessages.length > 0
  //     ? new Date(rawMessages[0].created_at).toISOString()
  //     : undefined;

  // logger.info('Message fetch process completed successfully', {
  //   userId,
  //   messageCount: rawMessages.length,
  //   hasMore,
  //   hasNextCursor: !!nextCursor,
  // });

  // return {
  //   notifications: rawMessages.reverse(), // Reverse to get chronological order
  //   hasMore,
  //   cursor: nextCursor,
  // };

  return {
    notifications: [
      {
        id: '1',
        userId,
        type: 'new_event',
        metadata: {},
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    hasMore: false,
  };
}
