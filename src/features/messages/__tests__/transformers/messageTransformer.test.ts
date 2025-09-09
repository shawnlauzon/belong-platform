import { describe, it, expect } from 'vitest';
import {
  transformMessage,
  transformMessageWithStatus,
  transformMessageStatus,
} from '../../transformers/messageTransformer';
import {
  createFakeMessageWithSender,
  createFakeMessageBasic,
} from '../../__fakes__';
import { createFakeCurrentUser, createFakeUserSummary } from '../../../users/__fakes__';
import type { Database } from '../../../../shared/types/database';
import type { MessageWithStatus } from '../../types/messageRow';

describe('messageTransformer', () => {
  const currentUserId = 'test-user-id';
  const otherUserId = 'other-user-id';

  describe('transformMessage', () => {
    it('should transform basic message with participant data correctly', () => {
      const currentUser = createFakeCurrentUser({ id: currentUserId });
      const otherUser = createFakeUserSummary({ id: otherUserId });
      const messageRow = createFakeMessageBasic({
        sender_id: otherUserId,
      });

      const result = transformMessage(
        messageRow,
        currentUserId,
        currentUser,
        otherUser,
      );

      expect(result).toEqual({
        id: messageRow.id,
        conversationId: '', // Empty by default, set by caller
        senderId: messageRow.sender_id,
        content: messageRow.content,
        isEdited: false, // Default value
        isDeleted: false, // Default value
        encryptionVersion: 1, // Default value
        createdAt: new Date(messageRow.created_at),
        updatedAt: new Date(messageRow.updated_at),
        sender: otherUser,
        isMine: false,
      });
    });

    it('should use current user data when sender is current user', () => {
      const currentUser = createFakeCurrentUser({ id: currentUserId });
      const otherUser = createFakeUserSummary({ id: otherUserId });
      const messageRow = createFakeMessageBasic({
        sender_id: currentUserId,
      });

      const result = transformMessage(
        messageRow,
        currentUserId,
        currentUser,
        otherUser,
      );

      // Sender should be a UserSummary derived from currentUser
      expect(result.sender).toEqual({
        id: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        fullName: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl,
      });
      expect(result.isMine).toBe(true);
    });

    it('should use other user data when sender is other user', () => {
      const currentUser = createFakeCurrentUser({ id: currentUserId });
      const otherUser = createFakeUserSummary({ id: otherUserId });
      const messageRow = createFakeMessageBasic({
        sender_id: otherUserId,
      });

      const result = transformMessage(
        messageRow,
        currentUserId,
        currentUser,
        otherUser,
      );

      expect(result.sender).toBe(otherUser);
      expect(result.isMine).toBe(false);
    });

    it('should convert date strings to Date objects', () => {
      const currentUser = createFakeCurrentUser({ id: currentUserId });
      const otherUser = createFakeUserSummary({ id: otherUserId });
      const messageRow = createFakeMessageBasic();

      const result = transformMessage(
        messageRow,
        currentUserId,
        currentUser,
        otherUser,
      );

      expect(result.createdAt).toEqual(new Date(messageRow.created_at));
      expect(result.updatedAt).toEqual(new Date(messageRow.updated_at));
      expect(result.createdAt instanceof Date).toBe(true);
      expect(result.updatedAt instanceof Date).toBe(true);
    });
  });

  describe('transformMessageWithStatus', () => {
    it('should include message status when available for current user', () => {
      const messageRow = createFakeMessageWithSender();
      const statusRow = {
        message_id: messageRow.id,
        user_id: currentUserId,
        delivered_at: '2024-01-01T10:00:00.000Z',
        read_at: '2024-01-01T10:30:00.000Z',
      };

      const messageWithStatus: MessageWithStatus & {
        sender: Database['public']['Tables']['profiles']['Row'];
      } = {
        ...messageRow,
        message_status: [statusRow],
      };

      const result = transformMessageWithStatus(
        messageWithStatus,
        currentUserId,
      );

      expect(result.status).toEqual({
        messageId: statusRow.message_id,
        userId: statusRow.user_id,
        deliveredAt: new Date(statusRow.delivered_at),
        readAt: new Date(statusRow.read_at),
      });
    });

    it('should not include status when not available for current user', () => {
      const messageRow = createFakeMessageWithSender();
      const statusRow = {
        message_id: messageRow.id,
        user_id: 'different-user-id',
        delivered_at: '2024-01-01T10:00:00.000Z',
        read_at: '2024-01-01T10:30:00.000Z',
      };

      const messageWithStatus: MessageWithStatus & {
        sender: Database['public']['Tables']['profiles']['Row'];
      } = {
        ...messageRow,
        message_status: [statusRow],
      };

      const result = transformMessageWithStatus(
        messageWithStatus,
        currentUserId,
      );

      expect(result.status).toBeUndefined();
    });

    it('should handle empty status array', () => {
      const messageRow = createFakeMessageWithSender();
      const messageWithStatus: MessageWithStatus & {
        sender: Database['public']['Tables']['profiles']['Row'];
      } = {
        ...messageRow,
        message_status: [],
      };

      const result = transformMessageWithStatus(
        messageWithStatus,
        currentUserId,
      );

      expect(result.status).toBeUndefined();
    });

    it('should transform all other message fields correctly', () => {
      const messageRow = createFakeMessageWithSender({
        sender_id: currentUserId,
      });
      const messageWithStatus: MessageWithStatus & {
        sender: Database['public']['Tables']['profiles']['Row'];
      } = {
        ...messageRow,
        message_status: [],
      };

      const result = transformMessageWithStatus(
        messageWithStatus,
        currentUserId,
      );

      expect(result.id).toBe(messageRow.id);
      expect(result.content).toBe(messageRow.content);
      expect(result.isMine).toBe(true);
    });
  });

  describe('transformMessageStatus', () => {
    it('should transform message status row correctly', () => {
      const deliveredAt = '2024-01-01T10:00:00.000Z';
      const readAt = '2024-01-01T10:30:00.000Z';
      const messageId = 'test-message-id';

      const statusRow: Database['public']['Tables']['message_status']['Row'] = {
        message_id: messageId,
        user_id: currentUserId,
        delivered_at: deliveredAt,
        read_at: readAt,
      };

      const result = transformMessageStatus(statusRow);

      expect(result).toEqual({
        messageId: statusRow.message_id,
        userId: statusRow.user_id,
        deliveredAt: new Date(statusRow.delivered_at),
        readAt: new Date(statusRow.read_at!),
      });
    });

    it('should handle null readAt', () => {
      const deliveredAt = '2024-01-01T10:00:00.000Z';
      const messageId = 'test-message-id';

      const statusRow: Database['public']['Tables']['message_status']['Row'] = {
        message_id: messageId,
        user_id: currentUserId,
        delivered_at: deliveredAt,
        read_at: null,
      };

      const result = transformMessageStatus(statusRow);

      expect(result.readAt).toBeNull();
      expect(result.deliveredAt).toEqual(new Date(statusRow.delivered_at));
    });

    it('should convert date strings to Date objects', () => {
      const deliveredAt = '2024-01-01T10:00:00.000Z';
      const readAt = '2024-01-01T10:30:00.000Z';
      const messageId = 'test-message-id';

      const statusRow: Database['public']['Tables']['message_status']['Row'] = {
        message_id: messageId,
        user_id: currentUserId,
        delivered_at: deliveredAt,
        read_at: readAt,
      };

      const result = transformMessageStatus(statusRow);

      expect(result.deliveredAt instanceof Date).toBe(true);
      expect(result.readAt instanceof Date).toBe(true);
    });
  });
});