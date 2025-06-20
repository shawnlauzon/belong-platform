import { getBelongClient } from '@belongnetwork/core';
import type { Message, MessageData } from '@belongnetwork/types';
import { forDbMessageInsert } from './messageTransformer';
import { fetchUserById } from '../../users/impl/fetchUserById';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';

export async function sendMessage(
  messageData: MessageData,
  toUserId: string
): Promise<Message> {
  const { supabase, logger } = getBelongClient();

  logger.debug('💬 API: Sending message', { 
    conversationId: messageData.conversationId,
    toUserId,
  });

  try {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.id) {
      logger.error('💬 API: User must be authenticated to send a message', {
        error: userError,
      });
      throw new Error(MESSAGE_AUTHENTICATION_REQUIRED);
    }

    const fromUserId = userData.user.id;

    // Transform to database format
    const dbMessage = forDbMessageInsert(messageData, fromUserId, toUserId);

    // Insert into database
    const { data: createdMessage, error } = await supabase
      .from('direct_messages')
      .insert([dbMessage])
      .select('*')
      .single();

    if (error) {
      logger.error('💬 API: Failed to send message', { error });
      throw error;
    }

    // Update conversation last_activity_at
    await supabase
      .from('conversations')
      .update({ 
        last_activity_at: new Date().toISOString(),
        last_message_id: createdMessage.id,
      })
      .eq('id', messageData.conversationId);

    // Fetch users for full message object
    const [fromUser, toUser] = await Promise.all([
      fetchUserById(fromUserId),
      fetchUserById(toUserId),
    ]);

    if (!fromUser || !toUser) {
      throw new Error('Failed to fetch user data for message');
    }

    // Convert to domain object
    const message: Message = {
      id: createdMessage.id,
      conversationId: createdMessage.conversation_id,
      fromUserId: createdMessage.from_user_id,
      toUserId: createdMessage.to_user_id,
      content: createdMessage.content,
      readAt: createdMessage.read_at ? new Date(createdMessage.read_at) : undefined,
      createdAt: new Date(createdMessage.created_at),
      updatedAt: new Date(createdMessage.updated_at),
      fromUser,
      toUser,
    };

    logger.info('💬 API: Successfully sent message', {
      id: message.id,
      conversationId: message.conversationId,
    });

    return message;
  } catch (error) {
    logger.error('💬 API: Error sending message', { error });
    throw error;
  }
}