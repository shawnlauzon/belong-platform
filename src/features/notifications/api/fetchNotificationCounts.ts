import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationCounts } from '../types/notificationCounts';

export async function fetchNotificationCounts(
  supabase: SupabaseClient<Database>
): Promise<NotificationCounts> {
  // Get notification counts
  const { data: notificationData, error: notificationError } = await supabase
    .from('notification_counts')
    .select('*')
    .single();

  if (notificationError && notificationError.code !== 'PGRST116') {
    throw notificationError;
  }

  // Get message counts from conversation participants
  const { data: messageData, error: messageError } = await supabase
    .from('conversation_participants')
    .select('unread_count')
    .gt('unread_count', 0);

  if (messageError) {
    throw messageError;
  }

  // Calculate totals
  const notificationCounts = notificationData || {
    unread_total: 0,
    unread_comments: 0,
    unread_claims: 0,
    unread_messages: 0,
    unread_resources: 0,
  };

  const messageTotal = messageData?.reduce((sum, participant) => sum + participant.unread_count, 0) || 0;

  return {
    total: (notificationCounts.unread_total || 0) + messageTotal,
    notifications: notificationCounts.unread_total || 0,
    messages: messageTotal,
    comments: notificationCounts.unread_comments || 0,
    claims: notificationCounts.unread_claims || 0,
    resources: notificationCounts.unread_resources || 0,
  };
}