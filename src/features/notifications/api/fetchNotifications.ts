import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Notification } from '../types/notification';
import type { NotificationDetail } from '../types/notificationDetail';
import { transformNotification } from '../transformers/notificationTransformer';
import { logger } from '@/shared';

export interface FetchNotificationsFilter {
  type?: Notification['type'];
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

interface FetchNotificationsResponse {
  notifications: NotificationDetail[];
  hasMore: boolean;
  cursor?: string;
}

export async function fetchNotifications(
  client: SupabaseClient<Database>,
  filter?: FetchNotificationsFilter,
): Promise<FetchNotificationsResponse> {
  const limit = filter?.limit || 50;
  
  logger.info('Starting notification fetch process', {
    filter,
    limit,
  });

  // Get the current user to filter notifications
  const { data: { user } } = await client.auth.getUser();
  
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Explicitly filter by user_id since views don't inherit RLS from underlying tables
  let query = client
    .from('notification_details')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (filter?.type) {
    query = query.eq('type', filter.type);
  }

  if (filter?.isRead !== undefined) {
    query = query.eq('is_read', filter.isRead);
  }

  if (filter?.offset) {
    query = query.range(filter.offset, filter.offset + limit - 1);
  }

  logger.debug('Executing notification fetch query', {
    limit: limit + 1,
    hasFilters: !!(filter?.type || filter?.isRead !== undefined),
  });

  const { data, error } = await query;

  if (error) {
    logger.error('Database error while fetching notifications', {
      error,
      filter,
      limit,
    });
    throw error;
  }

  if (!data) {
    logger.warn('No data returned from notification fetch query', {
      filter,
    });
    return { notifications: [], hasMore: false };
  }

  logger.debug('Raw notification data retrieved from database', {
    rawCount: data.length,
    requestedLimit: limit,
  });

  const hasMore = data.length > limit;
  const notifications = data.slice(0, limit);

  // Transform the raw data using the proper transformer
  const transformedNotifications = notifications.map(transformNotification);

  const nextCursor =
    hasMore && transformedNotifications.length > 0
      ? transformedNotifications[transformedNotifications.length - 1].createdAt.toISOString()
      : undefined;

  logger.info('Notification fetch process completed successfully', {
    notificationCount: transformedNotifications.length,
    hasMore,
    hasNextCursor: !!nextCursor,
  });

  return {
    notifications: transformedNotifications,
    hasMore,
    cursor: nextCursor,
  };
}
