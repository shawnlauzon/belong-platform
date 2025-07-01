import { logger } from '../../../shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../shared/types/database';
import type {
  ConversationInfo,
  ConversationFilter,
  MessageInfo,
  MessageFilter,
  MessageData,
} from '../types';
import {
  toConversationInfo,
  forDbConversationInsert,
} from '../transformers/conversationTransformer';
import {
  toMessageInfo,
  forDbMessageInsert,
} from '../transformers/messageTransformer';
import { createUserService } from '../../users/services/user.service';

/**
 * Conversations Service Factory
 * Creates conversations service with the provided Supabase client
 * Handles conversations and messages with proper dependency injection
 */
export const createConversationsService = (
  supabase: SupabaseClient<Database>
) => ({
  /**
   * Fetch conversations for a user with optional filtering
   */
  async fetchConversations(
    userId: string,
    filters?: ConversationFilter
  ): Promise<ConversationInfo[]> {
    logger.debug('💬 API: Fetching conversations', { userId, filters });

    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      // Apply filters if provided
      if (filters?.hasUnread !== undefined) {
        const unreadField = filters.hasUnread
          ? `unread_count_user1.gt.0,unread_count_user2.gt.0`
          : `unread_count_user1.eq.0,unread_count_user2.eq.0`;
        query = query.or(unreadField);
      }

      // Apply pagination
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 20;
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      query = query.range(start, end);

      const { data, error } = await query;

      if (error) {
        logger.error('💬 API: Failed to fetch conversations', {
          error,
          userId,
        });
        throw error;
      }

      if (!data) {
        return [];
      }

      // Get all unique user IDs for batch fetching
      const userIds = new Set<string>();
      data.forEach((conv) => {
        userIds.add(conv.participant_1_id);
        userIds.add(conv.participant_2_id);
      });

      // Batch fetch all users
      const userService = createUserService(supabase);
      const users = new Map();
      for (const id of userIds) {
        try {
          const user = await userService.fetchUserById(id);
          if (user) users.set(id, user);
        } catch (err) {
          logger.warn('💬 API: Failed to fetch user for conversation', {
            userId: id,
            error: err,
          });
        }
      }

      // Transform conversations with user data
      const conversations = data.map((conv) => toConversationInfo(conv));

      logger.info('💬 API: Successfully fetched conversations', {
        count: conversations.length,
        userId,
      });

      return conversations;
    } catch (error) {
      logger.error('💬 API: Failed to fetch conversations', { error, userId });
      throw error;
    }
  },

  /**
   * Fetch messages for a conversation with optional filtering
   */
  async fetchMessages(
    conversationId: string,
    filters?: MessageFilter
  ): Promise<MessageInfo[]> {
    logger.debug('💬 API: Fetching messages', { conversationId, filters });

    try {
      let query = supabase
        .from('direct_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });

      // Apply pagination
      const page = filters?.page || 1;
      const pageSize = filters?.pageSize || 50;
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      query = query.range(start, end);

      const { data, error } = await query;

      if (error) {
        logger.error('💬 API: Failed to fetch messages', {
          error,
          conversationId,
        });
        throw error;
      }

      if (!data) {
        return [];
      }

      // Get all unique user IDs for batch fetching
      const userIds = new Set<string>();
      data.forEach((msg) => {
        userIds.add(msg.from_user_id);
      });

      // Batch fetch all users
      const userService = createUserService(supabase);
      const users = new Map();
      for (const id of userIds) {
        try {
          const user = await userService.fetchUserById(id);
          if (user) users.set(id, user);
        } catch (err) {
          logger.warn('💬 API: Failed to fetch user for message', {
            userId: id,
            error: err,
          });
        }
      }

      // Transform messages with user data
      const messages = data.map((msg) => toMessageInfo(msg));

      logger.info('💬 API: Successfully fetched messages', {
        count: messages.length,
        conversationId,
      });

      return messages;
    } catch (error) {
      logger.error('💬 API: Failed to fetch messages', {
        error,
        conversationId,
      });
      throw error;
    }
  },

  /**
   * Send a new message
   */
  async sendMessage(messageData: MessageData): Promise<MessageInfo> {
    logger.debug('💬 API: Sending message', { messageData });

    try {
      // Get current user
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData?.user?.id) {
        logger.error('💬 API: User must be authenticated to send a message', {
          error: userError,
        });
        throw new Error('User must be authenticated to send a message');
      }

      const fromUserId = userData.user.id;

      let conversationId: string;
      let toUserId: string;

      // Handle two patterns: recipientId (new/existing conversation) or conversationId (existing conversation)
      if (messageData.recipientId) {
        // Pattern 1: recipientId provided - find or create conversation
        toUserId = messageData.recipientId;
        
        // Try to find existing conversation between these users
        const { data: existingConversation } = await supabase
          .from('conversations')
          .select('id, participant_1_id, participant_2_id')
          .or(`and(participant_1_id.eq.${fromUserId},participant_2_id.eq.${toUserId}),and(participant_1_id.eq.${toUserId},participant_2_id.eq.${fromUserId})`)
          .single();

        if (existingConversation) {
          // Use existing conversation
          conversationId = existingConversation.id;
        } else {
          // Create new conversation
          const conversationData = {
            participant_1_id: fromUserId < toUserId ? fromUserId : toUserId,
            participant_2_id: fromUserId < toUserId ? toUserId : fromUserId,
          };

          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert(conversationData)
            .select('id')
            .single();

          if (createError || !newConversation) {
            logger.error('💬 API: Failed to create conversation', {
              createError,
              conversationData,
            });
            throw new Error('Failed to create conversation');
          }

          conversationId = newConversation.id;
        }
      } else if (messageData.conversationId) {
        // Pattern 2: conversationId provided - find existing conversation
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('participant_1_id, participant_2_id')
          .eq('id', messageData.conversationId)
          .single();

        if (convError || !conversation) {
          logger.error('💬 API: Failed to find conversation', {
            convError,
            conversationId: messageData.conversationId,
          });
          throw new Error('Conversation not found');
        }

        // Determine the recipient (the other participant)
        toUserId =
          conversation.participant_1_id === fromUserId
            ? conversation.participant_2_id
            : conversation.participant_1_id;

        conversationId = messageData.conversationId;
      } else {
        throw new Error('Must provide either conversationId or recipientId');
      }

      // Transform to database format
      const dbData = forDbMessageInsert(
        { ...messageData, conversationId }, 
        fromUserId, 
        toUserId
      );

      const { data, error } = await supabase
        .from('direct_messages')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        logger.error('💬 API: Failed to send message', { error, messageData });
        throw error;
      }

      // Transform to domain format
      const message = toMessageInfo(data);

      logger.info('💬 API: Successfully sent message', {
        messageId: message.id,
        conversationId: message.conversationId,
      });

      return message;
    } catch (error) {
      logger.error('💬 API: Failed to send message', { error, messageData });
      throw error;
    }
  },

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    logger.debug('💬 API: Marking message as read', { messageId });

    try {
      const { error } = await supabase
        .from('direct_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) {
        logger.error('💬 API: Failed to mark message as read', {
          error,
          messageId,
        });
        throw error;
      }

      logger.info('💬 API: Successfully marked message as read', { messageId });
    } catch (error) {
      logger.error('💬 API: Failed to mark message as read', {
        error,
        messageId,
      });
      throw error;
    }
  },
});

export type ConversationsService = ReturnType<
  typeof createConversationsService
>;
