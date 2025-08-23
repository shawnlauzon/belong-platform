import { describe, it, expect } from 'vitest';
import { transformConversation } from '../../transformers/conversationTransformer';
import { createFakeConversationWithParticipants } from '../../__fakes__';

describe('conversationTransformer', () => {
  const currentUserId = 'test-user-id';
  const otherUserId = 'other-user-id';

  describe('transformConversation', () => {
    it('should transform conversation row to domain object correctly', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);

      const result = transformConversation(conversationRow, currentUserId);

      expect(result).toEqual({
        id: conversationRow.id,
        createdAt: new Date(conversationRow.created_at),
        updatedAt: new Date(conversationRow.updated_at),
        lastMessageAt: conversationRow.last_message_at ? new Date(conversationRow.last_message_at) : null,
        lastMessagePreview: conversationRow.last_message_preview,
        lastMessageSenderId: conversationRow.last_message_sender_id,
        otherParticipant: expect.objectContaining({
          id: otherUserId,
        }),
        unreadCount: expect.any(Number),
        lastReadAt: expect.any(Date),
      });
    });

    it('should identify the other participant correctly', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.otherParticipant.id).toBe(otherUserId);
    });

    it('should use unread count from current participant', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);
      const currentParticipant = conversationRow.conversation_participants.find(
        p => p.user_id === currentUserId
      );
      
      if (currentParticipant) {
        currentParticipant.unread_count = 5;
      }

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.unreadCount).toBe(5);
    });

    it('should handle null last message at', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId, {
        last_message_at: null,
      });

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastMessageAt).toBeNull();
    });

    it('should handle null last read at for current participant', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);
      const currentParticipant = conversationRow.conversation_participants.find(
        p => p.user_id === currentUserId
      );
      
      if (currentParticipant) {
        currentParticipant.last_read_at = null;
      }

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastReadAt).toBeNull();
    });

    it('should convert date strings to Date objects', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.createdAt).toEqual(new Date(conversationRow.created_at));
      expect(result.updatedAt).toEqual(new Date(conversationRow.updated_at));
      if (conversationRow.last_message_at) {
        expect(result.lastMessageAt).toEqual(new Date(conversationRow.last_message_at));
        expect(result.lastMessageAt instanceof Date).toBe(true);
      }
      
      const currentParticipant = conversationRow.conversation_participants.find(
        p => p.user_id === currentUserId
      );
      if (currentParticipant?.last_read_at) {
        expect(result.lastReadAt).toEqual(new Date(currentParticipant.last_read_at));
        expect(result.lastReadAt instanceof Date).toBe(true);
      }
      
      expect(result.createdAt instanceof Date).toBe(true);
      expect(result.updatedAt instanceof Date).toBe(true);
    });

    it('should throw error when other participant is not found', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);
      // Remove other participant to simulate invalid state
      conversationRow.conversation_participants = conversationRow.conversation_participants.filter(
        p => p.user_id === currentUserId
      );

      expect(() => transformConversation(conversationRow, currentUserId)).toThrow(
        'Invalid conversation participants'
      );
    });

    it('should throw error when current participant is not found', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId);
      // Remove current participant to simulate invalid state
      conversationRow.conversation_participants = conversationRow.conversation_participants.filter(
        p => p.user_id !== currentUserId
      );

      expect(() => transformConversation(conversationRow, 'non-existent-user')).toThrow(
        'Invalid conversation participants'
      );
    });

    it('should handle null/undefined preview and sender id', () => {
      const conversationRow = createFakeConversationWithParticipants(currentUserId, otherUserId, {
        last_message_preview: null,
        last_message_sender_id: null,
      });

      const result = transformConversation(conversationRow, currentUserId);

      expect(result.lastMessagePreview).toBeNull();
      expect(result.lastMessageSenderId).toBeNull();
    });
  });
});