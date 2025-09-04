import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Notification } from '../types/notification';
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
    .from('notification_details')
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

  // Use the view data directly with the transformer
  return (data || []).map(notificationTransformer);
}
