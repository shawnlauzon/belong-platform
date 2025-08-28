import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { CommunityConversation } from '../types/conversation';
import { transformCommunityConversation } from '../transformers/conversationTransformer';

/**
 * Fetches the community conversation for a given community
 * 
 * @param supabase - Supabase client instance
 * @param communityId - ID of the community to get conversation for
 * @returns Community conversation or null if not found
 */
export async function fetchCommunityConversation(
  supabase: SupabaseClient<Database>, 
  communityId: string
): Promise<CommunityConversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      id,
      created_at,
      updated_at,
      last_message_at,
      last_message_preview,
      last_message_sender_id,
      community_id,
      conversation_type
    `)
    .eq('community_id', communityId)
    .eq('conversation_type', 'community')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No conversation found for this community
      return null;
    }
    throw error;
  }

  // Get participant count
  const { count: participantCount, error: countError } = await supabase
    .from('conversation_participants')
    .select('*', { count: 'exact' })
    .eq('conversation_id', data.id);

  if (countError) {
    throw countError;
  }

  // Get current user's participant data for unread count and last read
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) {
    throw new Error('User not authenticated');
  }

  const { data: participantData, error: participantError } = await supabase
    .from('conversation_participants')
    .select('last_read_at, unread_count')
    .eq('conversation_id', data.id)
    .eq('user_id', currentUser.user.id)
    .single();

  if (participantError) {
    throw participantError;
  }

  return transformCommunityConversation(data, participantData, participantCount || 0);
}