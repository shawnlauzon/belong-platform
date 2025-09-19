import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationDetail } from '../types/notificationDetail';
import { toDomainNotification } from '../transformers';
import { logger } from '@/shared';

export interface FetchNotificationsFilter {
  isRead?: boolean;
}

export async function fetchNotifications(
  client: SupabaseClient<Database>,
  filter?: FetchNotificationsFilter,
): Promise<NotificationDetail[]> {
  logger.info('Fetching notifications', {
    filter,
  });

  // Get the current user to filter notifications
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Explicitly filter by user_id since views don't inherit RLS from underlying tables
  let query = client
    .from('notification_details')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (filter?.isRead !== undefined) {
    query = query.eq('is_read', filter.isRead);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Database error while fetching notifications', {
      error,
      filter,
    });
    throw error;
  }

  if (!data) {
    logger.warn('No data returned from notification fetch query', {
      filter,
    });
    return [];
  }

  logger.debug('Notifications fetched successfully', {
    count: data.length,
  });

  // Transform the raw data using the proper transformer
  return data.map(toDomainNotification);
}
