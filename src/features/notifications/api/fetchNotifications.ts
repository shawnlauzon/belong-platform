import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationDetail } from '../types/notificationDetail';
import { toDomainNotification } from '../transformers';
import { getAuthIdOrThrow, logger } from '@/shared';

export interface FetchNotificationsFilter {
  isRead?: boolean;
  since?: Date;
}

export async function fetchNotifications(
  client: SupabaseClient<Database>,
  filter?: FetchNotificationsFilter,
): Promise<NotificationDetail[]> {
  const userId = await getAuthIdOrThrow(client);

  // Explicitly filter by user_id since views don't inherit RLS from underlying tables
  let query = client
    .from('notification_details')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filter?.isRead !== undefined) {
    if (filter.isRead) {
      query = query.not('read_at', 'is', null);
    } else {
      query = query.is('read_at', null);
    }
  }

  if (filter?.since) {
    query = query.gt('created_at', filter.since.toISOString());
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

  return data.map(toDomainNotification);
}
