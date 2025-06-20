import { describe, it, expect } from 'vitest';
import type { Database } from '@belongnetwork/types/database';
import type { Message, MessageInfo, MessageData } from '@belongnetwork/types';
import { createMockDbDirectMessage, createMockUser } from '../../../test-utils/mocks';
import {
  toDomainMessage,
  toMessageInfo,
  forDbMessageInsert,
} from '../../impl/messageTransformer';

type DirectMessageRow = Database['public']['Tables']['direct_messages']['Row'];

describe('messageTransformer', () => {
  describe('toDomainMessage', () => {
    it('should transform database message to domain message with user references', () => {
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
        fromUserId: dbMessage.from_user_id,
        toUserId: dbMessage.to_user_id,
        content: dbMessage.content,
        readAt: new Date(dbMessage.read_at!),
        createdAt: new Date(dbMessage.created_at),
        updatedAt: new Date(dbMessage.updated_at),
        fromUser,
        toUser,
      });
    });

    it('should handle unread messages (null read_at)', () => {
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

    it('should throw error if fromUser is missing', () => {
      // Arrange
      const toUser = createMockUser();
      const dbMessage = createMockDbDirectMessage();

      // Act & Assert
      expect(() => {
        toDomainMessage(dbMessage, { fromUser: undefined as any, toUser });
      }).toThrow('From user is required');
    });

    it('should throw error if toUser is missing', () => {
      // Arrange
      const fromUser = createMockUser();
      const dbMessage = createMockDbDirectMessage();

      // Act & Assert
      expect(() => {
        toDomainMessage(dbMessage, { fromUser, toUser: undefined as any });
      }).toThrow('To user is required');
    });

    it('should validate user IDs match database record', () => {
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

  describe('toMessageInfo', () => {
    it('should transform database message to lightweight MessageInfo', () => {
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

    it('should handle unread messages in MessageInfo', () => {
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

  describe('forDbMessageInsert', () => {
    it('should transform MessageData to database insert format', () => {
      // Arrange
      const messageData: MessageData = {
        conversationId: 'conv-123',
        content: 'Hello world!',
      };
      const fromUserId = 'user-123';
      const toUserId = 'user-456';

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