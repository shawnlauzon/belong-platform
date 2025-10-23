import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';

/**
 * Fetches the unread message count for a specific conversation
 */
export async function fetchMessageUnreadCount(
  supabase: SupabaseClient<Database>,
  userId: string,
  conversationId: string,
): Promise<number> {

  // Get the user's last read timestamp for this conversation
  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('read_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .single();

  if (participantError) {
    throw participantError;
  }

  if (!participantData) {
    throw new Error('User is not a participant in this conversation');
  }

  // If read_at is null, all messages are unread
  if (!participantData.read_at) {
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
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
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .neq('sender_id', userId) // Don't count own messages
    .gt('created_at', participantData.read_at);

  if (error) {
    throw error;
  }

  return count || 0;
}

/**
 * Fetches the total unread message count across all conversations for the current user
 */
export async function fetchTotalMessageUnreadCount(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<number> {

  // Get all conversation participants for this user
  const { data: participants, error: participantsError } = await supabase
    .from('conversation_participants')
    .select('conversation_id, read_at')
    .eq('user_id', userId);

  if (participantsError) {
    throw participantsError;
  }

  if (!participants || participants.length === 0) {
    return 0;
  }

  let totalUnread = 0;

  // For each conversation, count unread messages
  for (const participant of participants) {
    const unreadCount = await fetchMessageUnreadCount(
      supabase,
      userId,
      participant.conversation_id,
    );
    totalUnread += unreadCount;
  }

  return totalUnread;
}
