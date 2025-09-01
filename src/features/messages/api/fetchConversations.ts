import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../../shared/types/database';
import { ConversationListResponse, ConversationListFilters } from '../types';
import { ConversationWithParticipants } from '../types/messageRow';
import { transformConversation } from '../transformers';
import { logger } from '../../../shared';

export async function fetchConversations(
  client: SupabaseClient<Database>,
  filters?: ConversationListFilters,
  limit: number = 20,
  cursor?: string
): Promise<ConversationListResponse> {
  const { data: userData, error: userError } = await client.auth.getUser();
  
  if (userError) {
    logger.error('Error fetching user', { error: userError });
    throw userError;
  }

  const userId = userData.user.id;

  let query = client
    .from('conversations')
    .select(`
      *,
      conversation_participants!inner(
        user_id,
        unread_count,
        last_read_at,
        public_profiles(id, first_name, avatar_url)
      )
    `)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('last_message_at', cursor);
  }

  if (filters?.hasUnread) {
    query = query.gt('conversation_participants.unread_count', 0);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Error fetching conversations', { error });
    throw error;
  }

  if (!data) {
    return { conversations: [], hasMore: false };
  }

  const hasMore = data.length > limit;
  const conversations = data
    .slice(0, limit)
    .filter(conv => {
      const participants = conv.conversation_participants as Array<{
        user_id: string;
        unread_count: number;
        last_read_at: string | null;
        public_profiles: {
          id: string | null;
          first_name: string | null;
          avatar_url: string | null;
        };
      }>;
      return participants.length === 2 && 
             participants.some(p => p.user_id === userId);
    })
    .map(conv => transformConversation(conv as ConversationWithParticipants, userId));

  const nextCursor = hasMore && conversations.length > 0
    ? conversations[conversations.length - 1].lastMessageAt?.toISOString()
    : undefined;

  return {
    conversations,
    hasMore,
    cursor: nextCursor,
  };
}