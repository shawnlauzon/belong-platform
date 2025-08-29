import { describe, it, expect } from 'vitest';
import {
  transformConversation,
  transformCommunityConversation,
} from '../../transformers/conversationTransformer';
import { createFakeConversationWithParticipants } from '../../__fakes__';
import { ConversationRow } from '../../types';

describe('conversationTransformer', () => {
  const currentUserId = 'test-user-id';
  const otherUserId = 'other-user-id';

  describe('transformConversation', () => {
    it('should transform conversation row to domain object correctly', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result).toEqual({
        id: conversationRow.id,
        createdAt: new Date(conversationRow.created_at),
        updatedAt: new Date(conversationRow.updated_at),
        lastMessageAt: conversationRow.last_message_at
          ? new Date(conversationRow.last_message_at)
          : null,
        lastMessagePreview: conversationRow.last_message_preview,
        lastMessageSenderId: conversationRow.last_message_sender_id,
        otherParticipant: expect.objectContaining({
          id: otherUserId,
        }),
        unreadCount: expect.any(Number),
        lastReadAt: expect.any(Date),
        conversationType: 'direct',
      });
    });

    it('should identify the other participant correctly', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.otherParticipant.id).toBe(otherUserId);
    });

    it('should use unread count from current participant', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );
      const currentParticipant = conversationRow.conversation_participants.find(
        (p) => p.user_id === currentUserId,
      );

      if (currentParticipant) {
        currentParticipant.unread_count = 5;
      }

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.unreadCount).toBe(5);
    });

    it('should handle null last message at', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
        {
          last_message_at: null,
        },
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastMessageAt).toBeNull();
    });

    it('should handle null last read at for current participant', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );
      const currentParticipant = conversationRow.conversation_participants.find(
        (p) => p.user_id === currentUserId,
      );

      if (currentParticipant) {
        currentParticipant.last_read_at = null;
      }

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastReadAt).toBeNull();
    });

    it('should convert date strings to Date objects', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.createdAt).toEqual(new Date(conversationRow.created_at));
      expect(result.updatedAt).toEqual(new Date(conversationRow.updated_at));
      if (conversationRow.last_message_at) {
        expect(result.lastMessageAt).toEqual(
          new Date(conversationRow.last_message_at),
        );
        expect(result.lastMessageAt instanceof Date).toBe(true);
      }

      const currentParticipant = conversationRow.conversation_participants.find(
        (p) => p.user_id === currentUserId,
      );
      if (currentParticipant?.last_read_at) {
        expect(result.lastReadAt).toEqual(
          new Date(currentParticipant.last_read_at),
        );
        expect(result.lastReadAt instanceof Date).toBe(true);
      }

      expect(result.createdAt instanceof Date).toBe(true);
      expect(result.updatedAt instanceof Date).toBe(true);
    });

    it('should throw error when other participant is not found', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );
      // Remove other participant to simulate invalid state
      conversationRow.conversation_participants =
        conversationRow.conversation_participants.filter(
          (p) => p.user_id === currentUserId,
        );

      expect(() =>
        transformConversation(conversationRow, currentUserId),
      ).toThrow('Invalid conversation participants');
    });

    it('should throw error when current participant is not found', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );
      // Remove current participant to simulate invalid state
      conversationRow.conversation_participants =
        conversationRow.conversation_participants.filter(
          (p) => p.user_id !== currentUserId,
        );

      expect(() =>
        transformConversation(conversationRow, 'non-existent-user'),
      ).toThrow('Invalid conversation participants');
    });

    it('should handle null/undefined preview and sender id', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
        {
          last_message_preview: null,
          last_message_sender_id: null,
        },
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastMessagePreview).toBeNull();
      expect(result.lastMessageSenderId).toBeNull();
    });

    it('should set conversation type as direct', () => {
      const conversationRow = createFakeConversationWithParticipants(
        currentUserId,
        otherUserId,
      );

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.conversationType).toBe('direct');
    });
  });

  describe('transformCommunityConversation', () => {
    const mockCommunityId = 'community-123';

    const createMockConversationRow = (
      overrides?: Partial<ConversationRow>,
    ): ConversationRow => ({
      id: 'conversation-456',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      last_message_preview: 'Welcome to the community!',
      last_message_sender_id: 'user-789',
      community_id: mockCommunityId,
      conversation_type: 'community',
      ...overrides,
    });

    const mockParticipantData = {
      last_read_at: new Date().toISOString(),
      unread_count: 3,
    };

    it('should transform community conversation row to domain object correctly', () => {
      const conversationRow = createMockConversationRow();
      const participantCount = 15;

      const result = transformCommunityConversation(
        conversationRow,
        mockParticipantData,
        participantCount,
      );

      expect(result).toEqual({
        id: conversationRow.id,
        createdAt: new Date(conversationRow.created_at),
        updatedAt: new Date(conversationRow.updated_at),
        lastMessageAt: conversationRow.last_message_at
          ? new Date(conversationRow.last_message_at)
          : null,
        lastMessagePreview: 'Welcome to the community!',
        lastMessageSenderId: 'user-789',
        communityId: mockCommunityId,
        conversationType: 'community',
        unreadCount: 3,
        lastReadAt: new Date(mockParticipantData.last_read_at),
        participantCount: 15,
      });
    });

    it('should handle null values correctly', () => {
      const conversationRow = createMockConversationRow({
        last_message_at: null,
        last_message_preview: null,
        last_message_sender_id: null,
      });

      const participantData = {
        last_read_at: null,
        unread_count: 0,
      };

      const result = transformCommunityConversation(
        conversationRow,
        participantData,
        5,
      );

      expect(result.lastMessageAt).toBeNull();
      expect(result.lastMessagePreview).toBeNull();
      expect(result.lastMessageSenderId).toBeNull();
      expect(result.lastReadAt).toBeNull();
      expect(result.unreadCount).toBe(0);
    });

    it('should convert date strings to Date objects', () => {
      const conversationRow = createMockConversationRow({
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
        last_message_at: '2024-01-01T12:30:00Z',
      });

      const participantData = {
        last_read_at: '2024-01-01T12:00:00Z',
        unread_count: 3,
      };

      const result = transformCommunityConversation(
        conversationRow,
        participantData,
        10,
      );

      expect(result.createdAt).toEqual(new Date('2024-01-01T00:00:00Z'));
      expect(result.updatedAt).toEqual(new Date('2024-01-01T12:00:00Z'));
      expect(result.lastMessageAt).toEqual(new Date('2024-01-01T12:30:00Z'));
      expect(result.lastReadAt).toEqual(new Date('2024-01-01T12:00:00Z'));

      expect(result.createdAt instanceof Date).toBe(true);
      expect(result.updatedAt instanceof Date).toBe(true);
      expect(result.lastMessageAt instanceof Date).toBe(true);
      expect(result.lastReadAt instanceof Date).toBe(true);
    });

    it('should throw error when community_id is null', () => {
      const conversationRow = createMockConversationRow({
        community_id: null,
      });

      expect(() =>
        transformCommunityConversation(conversationRow, mockParticipantData, 5),
      ).toThrow('Community conversation must have community_id');
    });

    it('should set conversation type as community', () => {
      const conversationRow = createMockConversationRow();

      const result = transformCommunityConversation(
        conversationRow,
        mockParticipantData,
        8,
      );

      expect(result.conversationType).toBe('community');
    });

    it('should include participant count', () => {
      const conversationRow = createMockConversationRow();
      const participantCount = 25;

      const result = transformCommunityConversation(
        conversationRow,
        mockParticipantData,
        participantCount,
      );

      expect(result.participantCount).toBe(25);
    });
  });
});
