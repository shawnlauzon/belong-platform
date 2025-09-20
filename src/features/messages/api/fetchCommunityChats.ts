import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { CommunityChat } from '../types';
import { MessageRow } from '../types/messageRow';
import { toDomainMessage } from '../transformers';
import { logger } from '../../../shared';

export async function fetchCommunityChats(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<CommunityChat[]> {
  // Get communities where the user is a member
  const { data: memberships, error: membershipsError } = await supabase
    .from('community_memberships')
    .select('community_id')
    .eq('user_id', userId);

  if (membershipsError) {
    logger.error('Error fetching user community memberships', { error: membershipsError });
    throw membershipsError;
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const communityIds = memberships.map(m => m.community_id);

  // For each community, get the latest message
  const chats: CommunityChat[] = [];

  for (const communityId of communityIds) {
    // Get the latest message for this community
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('community_id', communityId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1);

    if (messagesError) {
      logger.error('Error fetching community messages', {
        error: messagesError,
        communityId
      });
      // Continue with other communities instead of throwing
      continue;
    }

    const lastMessage = messages && messages.length > 0
      ? toDomainMessage(messages[0] as MessageRow)
      : null;

    chats.push({
      communityId,
      lastMessage,
    });
  }

  // Sort by last message timestamp, with communities that have no messages last
  return chats.sort((a, b) => {
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;

    return new Date(b.lastMessage.createdAt).getTime() -
           new Date(a.lastMessage.createdAt).getTime();
  });
}