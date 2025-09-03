import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Notification } from '../types/notification';
import type { NotificationRow } from '../types/notificationRow';
import { notificationTransformer } from '../transformers';

export interface FetchNotificationsFilter {
  type?: Notification['type'];
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

export async function fetchNotifications(
  supabase: SupabaseClient<Database>,
  filter: FetchNotificationsFilter = {},
): Promise<Notification[]> {
  const { type, isRead, limit = 20, offset = 0 } = filter;

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (type) {
    query = query.eq('type', type);
  }

  if (typeof isRead === 'boolean') {
    query = query.eq('is_read', isRead);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data as NotificationRow[]).map(notificationTransformer);
}
