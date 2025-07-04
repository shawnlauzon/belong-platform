import { describe, it, expect } from 'vitest';
import type { Message, MessageInfo, MessageData } from '../../types';
import { createMockUser } from '../../../users/__mocks__';
import {
  toDomainMessage,
  toMessageInfo,
  forDbInsert as forDbMessageInsert,
} from '../messageTransformer';
import { createMockDbDirectMessage } from '../../__mocks__';

describe.skip('messageTransformer', () => {
  describe.skip('toDomainMessage', () => {
    it.skip('should transform database message to domain message with user references', () => {
      // Arrange
      const fromUser = createMockUser();
      const toUser = createMockUser();
      const dbMessage = createMockDbDirectMessage({
        from_user_id: fromUser.id,
        to_user_id: toUser.id,
        content: 'Hello there!',
        read_at: new Date('2023-01-01').toISOString(),
      });

      // Act
      const result = toDomainMessage(dbMessage, { fromUser, toUser });

      // Assert
      expect(result).toEqual<Message>({
        id: dbMessage.id,
        conversationId: dbMessage.conversation_id,
        content: dbMessage.content,
        readAt: new Date(dbMessage.read_at!),
        createdAt: new Date(dbMessage.created_at),
        updatedAt: new Date(dbMessage.updated_at),
        fromUser,
        toUser,
      });
    });

    it.skip('should handle unread messages (null read_at)', () => {
      // Arrange
      const fromUser = createMockUser();
      const toUser = createMockUser();
      const dbMessage = createMockDbDirectMessage({
        from_user_id: fromUser.id,
        to_user_id: toUser.id,
        read_at: null,
      });

      // Act
      const result = toDomainMessage(dbMessage, { fromUser, toUser });

      // Assert
      expect(result.readAt).toBeUndefined();
    });

    it.skip('should throw error if fromUser is missing', () => {
      // Arrange
      const toUser = createMockUser();
      const dbMessage = createMockDbDirectMessage();

      // Act & Assert
      expect(() => {
        toDomainMessage(dbMessage, { fromUser: undefined as any, toUser });
      }).toThrow('From user is required');
    });

    it.skip('should throw error if toUser is missing', () => {
      // Arrange
      const fromUser = createMockUser();
      const dbMessage = createMockDbDirectMessage();

      // Act & Assert
      expect(() => {
        toDomainMessage(dbMessage, { fromUser, toUser: undefined as any });
      }).toThrow('To user is required');
    });

    it.skip('should validate user IDs match database record', () => {
      // Arrange
      const fromUser = createMockUser();
      const toUser = createMockUser();
      const dbMessage = createMockDbDirectMessage({
        from_user_id: 'different-id',
        to_user_id: toUser.id,
      });

      // Act & Assert
      expect(() => {
        toDomainMessage(dbMessage, { fromUser, toUser });
      }).toThrow('From user ID does not match');
    });
  });

  describe.skip('toMessageInfo', () => {
    it.skip('should transform database message to lightweight MessageInfo', () => {
      // Arrange
      const dbMessage = createMockDbDirectMessage({
        content: 'Hello there!',
        read_at: new Date('2023-01-01').toISOString(),
      });

      // Act
      const result = toMessageInfo(dbMessage);

      // Assert
      expect(result).toEqual<MessageInfo>({
        id: dbMessage.id,
        conversationId: dbMessage.conversation_id,
        fromUserId: dbMessage.from_user_id,
        toUserId: dbMessage.to_user_id,
        content: dbMessage.content,
        readAt: new Date(dbMessage.read_at!),
        createdAt: new Date(dbMessage.created_at),
        updatedAt: new Date(dbMessage.updated_at),
      });
    });

    it.skip('should handle unread messages in MessageInfo', () => {
      // Arrange
      const dbMessage = createMockDbDirectMessage({
        read_at: null,
      });

      // Act
      const result = toMessageInfo(dbMessage);

      // Assert
      expect(result.readAt).toBeUndefined();
    });
  });

  describe.skip('forDbMessageInsert', () => {
    it.skip('should transform MessageData to database insert format', () => {
      const fromUserId = 'user-123';
      const toUserId = 'user-456';

      // Arrange
      const messageData: MessageData = {
        conversationId: 'conv-123',
        recipientId: toUserId,
        content: 'Hello world!',
      };

      // Act
      const result = forDbMessageInsert(messageData, fromUserId, toUserId);

      // Assert
      expect(result).toEqual({
        conversation_id: messageData.conversationId,
        content: messageData.content,
        from_user_id: fromUserId,
        to_user_id: toUserId,
      });
    });
  });
});
