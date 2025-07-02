import { describe, it, expect } from 'vitest';
import type {
  Conversation,
  ConversationInfo,
  ConversationData,
} from '../../types';
import { createMockDbConversation, createMockMessage } from '../../__mocks__';
import {
  toDomainConversation,
  toConversationInfo,
  forDbInsert as forDbConversationInsert,
} from '../conversationTransformer';
import { createMockUser } from '../../../users/__mocks__';

describe('conversationTransformer', () => {
  describe('toDomainConversation', () => {
    it('should transform database conversation to domain conversation with participants', () => {
      // Arrange
      const participant1 = createMockUser();
      const participant2 = createMockUser();
      const lastMessage = createMockMessage();
      const dbConversation = createMockDbConversation({
        participant_1_id: participant1.id,
        participant_2_id: participant2.id,
        last_message_id: lastMessage.id,
        last_activity_at: new Date('2023-01-01').toISOString(),
      });

      // Act
      const result = toDomainConversation(dbConversation, {
        participants: [participant1, participant2],
        lastMessage,
      });

      // Assert
      expect(result).toEqual<Conversation>({
        id: dbConversation.id,
        participant1Id: dbConversation.participant_1_id,
        participant2Id: dbConversation.participant_2_id,
        lastActivityAt: new Date(dbConversation.last_activity_at),
        lastMessageId: dbConversation.last_message_id,
        createdAt: new Date(dbConversation.created_at),
        updatedAt: new Date(dbConversation.updated_at),
        participants: [participant1, participant2],
        lastMessage,
      });
    });

    it('should handle conversation without last message', () => {
      // Arrange
      const participant1 = createMockUser();
      const participant2 = createMockUser();
      const dbConversation = createMockDbConversation({
        participant_1_id: participant1.id,
        participant_2_id: participant2.id,
        last_message_id: null,
      });

      // Act
      const result = toDomainConversation(dbConversation, {
        participants: [participant1, participant2],
        lastMessage: undefined,
      });

      // Assert
      expect(result.lastMessageId).toBeUndefined();
      expect(result.lastMessage).toBeUndefined();
    });

    it('should throw error if participants array is wrong length', () => {
      // Arrange
      const participant1 = createMockUser();
      const dbConversation = createMockDbConversation();

      // Act & Assert
      expect(() => {
        toDomainConversation(dbConversation, {
          participants: [participant1] as any,
          lastMessage: undefined,
        });
      }).toThrow('Participants must be an array of exactly 2 users');
    });

    it('should validate participant IDs match database record', () => {
      // Arrange
      const participant1 = createMockUser();
      const participant2 = createMockUser();
      const dbConversation = createMockDbConversation({
        participant_1_id: 'different-id',
        participant_2_id: participant2.id,
      });

      // Act & Assert
      expect(() => {
        toDomainConversation(dbConversation, {
          participants: [participant1, participant2],
          lastMessage: undefined,
        });
      }).toThrow('Participant IDs do not match database record');
    });
  });

  describe('toConversationInfo', () => {
    it('should transform database conversation to lightweight ConversationInfo', () => {
      // Arrange
      const dbConversation = createMockDbConversation({
        last_activity_at: new Date('2023-01-01').toISOString(),
        last_message_id: 'msg-123',
      });
      const lastMessagePreview = 'Hello there!';
      const unreadCount = 3;

      // Act
      const result = toConversationInfo(
        dbConversation,
        lastMessagePreview,
        unreadCount
      );

      // Assert
      expect(result).toEqual<ConversationInfo>({
        id: dbConversation.id,
        participant1Id: dbConversation.participant_1_id,
        participant2Id: dbConversation.participant_2_id,
        lastActivityAt: new Date(dbConversation.last_activity_at),
        lastMessageId: dbConversation.last_message_id,
        createdAt: new Date(dbConversation.created_at),
        updatedAt: new Date(dbConversation.updated_at),
        lastMessagePreview,
        unreadCount,
      });
    });

    it('should handle conversation without last message', () => {
      // Arrange
      const dbConversation = createMockDbConversation({
        last_message_id: null,
      });

      // Act
      const result = toConversationInfo(dbConversation, undefined, 0);

      // Assert
      expect(result.lastMessageId).toBeUndefined();
      expect(result.lastMessagePreview).toBeUndefined();
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('forDbConversationInsert', () => {
    it('should transform ConversationData to database insert format', () => {
      // Arrange
      const conversationData: ConversationData = {
        participant1Id: 'user-123',
        participant2Id: 'user-456',
      };

      // Act
      const result = forDbConversationInsert(conversationData);

      // Assert
      expect(result).toEqual({
        participant_1_id: conversationData.participant1Id,
        participant_2_id: conversationData.participant2Id,
      });
    });
  });
});
