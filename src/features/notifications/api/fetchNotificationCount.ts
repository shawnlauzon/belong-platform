import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { NotificationCount } from '../types/notificationCount';

export async function fetchNotificationCount(
  supabase: SupabaseClient<Database>
): Promise<NotificationCount> {
  // Get notification count from user_state
  const { data: userStateData, error: userStateError } = await supabase
    .from('user_state')
    .select('unread_notification_count')
    .single();

  if (userStateError && userStateError.code !== 'PGRST116') {
    throw userStateError;
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
  const notificationCount = userStateData?.unread_notification_count || 0;
  const messageTotal = messageData?.reduce((sum, participant) => sum + participant.unread_count, 0) || 0;

  return {
    total: notificationCount + messageTotal,
  };
}