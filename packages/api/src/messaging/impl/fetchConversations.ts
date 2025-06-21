import { getBelongClient } from '@belongnetwork/core';
import type { ConversationInfo, ConversationFilter } from '@belongnetwork/types';
import { toConversationInfo } from './conversationTransformer';
import { toDomainUser } from '../../users/transformers/userTransformer';

export async function fetchConversations(
  userId: string,
  filters?: ConversationFilter
): Promise<ConversationInfo[]> {
  const { supabase, logger } = getBelongClient();

  logger.debug('💬 API: Fetching conversations', { userId, filters });

  try {
    // 1. Fetch conversations where user is a participant
    let conversationQuery = supabase
      .from('conversations')
      .select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_activity_at', { ascending: false });

    // Apply pagination if provided
    if (filters?.page !== undefined && filters?.pageSize !== undefined) {
      const start = filters.page * filters.pageSize;
      const end = start + filters.pageSize - 1;
      conversationQuery = conversationQuery.range(start, end);
    }

    const { data: conversations, error: conversationError } = await conversationQuery;

    if (conversationError) {
      logger.error('💬 API: Failed to fetch conversations', { error: conversationError });
      throw conversationError;
    }

    if (!conversations || conversations.length === 0) {
      return [];
    }

    // 2. Batch fetch last messages for conversations that have them
    const conversationsWithMessages = conversations.filter(conv => conv.last_message_id);
    const lastMessageIds = conversationsWithMessages.map(conv => conv.last_message_id!);
    
    let lastMessages: any[] = [];
    if (lastMessageIds.length > 0) {
      const { data: messageData, error: messageError } = await supabase
        .from('direct_messages')
        .select('*')
        .in('id', lastMessageIds)
        .order('created_at', { ascending: false });

      if (messageError) {
        logger.error('💬 API: Failed to fetch last messages', { error: messageError });
        // Don't throw - we can continue without last message previews
      } else {
        lastMessages = messageData || [];
      }
    }

    // 3. Collect unique user IDs from all conversations
    const userIds = new Set<string>();
    conversations.forEach(conv => {
      userIds.add(conv.participant_1_id);
      userIds.add(conv.participant_2_id);
    });

    // 4. Batch fetch user profiles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', [...userIds]);

    if (profileError) {
      logger.error('💬 API: Failed to fetch user profiles', { error: profileError });
      throw profileError;
    }

    // 5. Batch fetch unread counts for all conversations
    const conversationIds = conversations.map(conv => conv.id);
    const { data: unreadMessages, error: unreadError } = await supabase
      .from('direct_messages')
      .select('conversation_id, read_at, from_user_id')
      .in('conversation_id', conversationIds)
      .neq('from_user_id', userId); // Don't count own messages as unread

    // Count unread messages per conversation
    const unreadCounts = new Map<string, number>();
    if (!unreadError && unreadMessages) {
      conversations.forEach(conv => unreadCounts.set(conv.id, 0)); // Initialize all to 0
      unreadMessages
        .filter(msg => msg.read_at === null) // Filter for unread messages
        .forEach(msg => {
          const currentCount = unreadCounts.get(msg.conversation_id) || 0;
          unreadCounts.set(msg.conversation_id, currentCount + 1);
        });
    } else {
      conversations.forEach(conv => unreadCounts.set(conv.id, 0));
    }

    // 6. Transform to domain objects
    const conversationInfos = conversations.map(conv => {
      const lastMessage = lastMessages.find(msg => msg.id === conv.last_message_id);
      const lastMessagePreview = lastMessage ? lastMessage.content : undefined;
      const unreadCount = unreadCounts.get(conv.id) || 0;

      return toConversationInfo(conv, lastMessagePreview, unreadCount);
    });

    logger.debug('💬 API: Successfully fetched conversations', {
      count: conversationInfos.length,
    });

    return conversationInfos;
  } catch (error) {
    logger.error('💬 API: Error fetching conversations', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}