import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { getAuthUserId } from '@/features/auth/api';

/**
 * Fetches the unread message count for a specific community chat
 */
export async function fetchCommunityUnreadCount(
  supabase: SupabaseClient<Database>,
  communityId: string,
): Promise<number> {
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get the user's last read timestamp for this community
  const { data: membershipData, error: membershipError } = await supabase
    .from('community_memberships')
    .select('chat_read_at')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .single();

  if (membershipError) {
    throw membershipError;
  }

  if (!membershipData) {
    throw new Error('User is not a member of this community');
  }

  // If chat_read_at is null, all messages are unread
  if (!membershipData.chat_read_at) {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', communityId)
      .eq('is_deleted', false)
      .neq('sender_id', userId); // Don't count own messages

    if (error) {
      throw error;
    }

    return count || 0;
  }

  // Count messages created after the last read timestamp
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', communityId)
    .eq('is_deleted', false)
    .neq('sender_id', userId) // Don't count own messages
    .gt('created_at', membershipData.chat_read_at);

  if (error) {
    throw error;
  }

  return count || 0;
}

/**
 * Fetches the total unread community message count across all communities for the current user
 */
export async function fetchTotalCommunityUnreadCount(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  const userId = await getAuthUserId(supabase);
  if (!userId) {
    throw new Error('User not authenticated');
  }

  // Get all community memberships for this user
  const { data: memberships, error: membershipsError } = await supabase
    .from('community_memberships')
    .select('community_id, chat_read_at')
    .eq('user_id', userId);

  if (membershipsError) {
    throw membershipsError;
  }

  if (!memberships || memberships.length === 0) {
    return 0;
  }

  let totalUnread = 0;

  // For each community, count unread messages
  for (const membership of memberships) {
    const unreadCount = await fetchCommunityUnreadCount(
      supabase,
      membership.community_id,
    );
    totalUnread += unreadCount;
  }

  return totalUnread;
}
