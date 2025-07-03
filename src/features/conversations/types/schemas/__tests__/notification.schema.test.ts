import { describe, it, expect } from 'vitest';
import {
  NotificationSchema,
  NotificationCreateSchema,
  NotificationUpdateSchema,
  NotificationListSchema,
  NotificationWithRelationsSchema,
  NotificationDbSchema,
  NotificationFromDbSchema,
  NotificationFilterSchema
} from '../notification.schema';

describe.skip('NotificationSchema', () => {
  const validNotification = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: '123e4567-e89b-12d3-a456-426614174001',
    type: 'message' as const,
    title: 'New message',
    content: 'You have a new message',
    data: { senderId: '123e4567-e89b-12d3-a456-426614174002' },
    read: false,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z')
  };

  describe.skip('NotificationSchema', () => {
    it.skip('should validate a valid notification', () => {
      const result = NotificationSchema.safeParse(validNotification);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validNotification.id);
        expect(result.data.type).toBe('message');
        expect(result.data.read).toBe(false);
      }
    });

    it.skip('should reject invalid type', () => {
      const invalid = { ...validNotification, type: 'invalid' };
      const result = NotificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it.skip('should reject invalid UUID', () => {
      const invalid = { ...validNotification, id: 'not-a-uuid' };
      const result = NotificationSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it.skip('should accept optional content', () => {
      const { content, ...withoutContent } = validNotification;
      const result = NotificationSchema.safeParse(withoutContent);
      expect(result.success).toBe(true);
    });

    it.skip('should validate enum types correctly', () => {
      const types = ['message', 'mention', 'system'];
      types.forEach(type => {
        const notification = { ...validNotification, type };
        const result = NotificationSchema.safeParse(notification);
        expect(result.success).toBe(true);
      });
    });
  });

  describe.skip('NotificationCreateSchema', () => {
    it.skip('should omit auto-generated fields', () => {
      const createData = {
        userId: validNotification.userId,
        type: validNotification.type,
        title: validNotification.title,
        content: validNotification.content,
        data: validNotification.data
      };

      const result = NotificationCreateSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject({
          userId: createData.userId,
          type: createData.type,
          title: createData.title,
          content: createData.content,
          data: createData.data
        });
      }
    });

    it.skip('should omit id field when present', () => {
      const withId = { ...validNotification };
      const result = NotificationCreateSchema.safeParse(withId);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('id');
        expect(result.data).not.toHaveProperty('createdAt');
        expect(result.data).not.toHaveProperty('updatedAt');
      }
    });

    it.skip('should accept read value when provided', () => {
      const createData = {
        userId: validNotification.userId,
        type: validNotification.type,
        title: validNotification.title,
        read: true
      };

      const result = NotificationCreateSchema.safeParse(createData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.read).toBe(true);
      }
    });
  });

  describe.skip('NotificationUpdateSchema', () => {
    it.skip('should allow partial updates', () => {
      const updateData = { read: true };
      const result = NotificationUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it.skip('should allow updating title only', () => {
      const updateData = { title: 'Updated title' };
      const result = NotificationUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
    });

    it.skip('should reject invalid type in update', () => {
      const updateData = { type: 'invalid' };
      const result = NotificationUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(false);
    });
  });

  describe.skip('NotificationListSchema', () => {
    it.skip('should extract IDs from data object', () => {
      const notification = {
        ...validNotification,
        data: {
          senderId: '123e4567-e89b-12d3-a456-426614174002',
          conversationId: '123e4567-e89b-12d3-a456-426614174003',
          messageId: '123e4567-e89b-12d3-a456-426614174004'
        }
      };

      const result = NotificationListSchema.safeParse(notification);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.senderId).toBe('123e4567-e89b-12d3-a456-426614174002');
        expect(result.data.conversationId).toBe('123e4567-e89b-12d3-a456-426614174003');
        expect(result.data.messageId).toBe('123e4567-e89b-12d3-a456-426614174004');
      }
    });

    it.skip('should handle missing data object', () => {
      const { data, ...notificationWithoutData } = validNotification;
      const result = NotificationListSchema.safeParse(notificationWithoutData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.senderId).toBeUndefined();
        expect(result.data.conversationId).toBeUndefined();
        expect(result.data.messageId).toBeUndefined();
      }
    });
  });

  describe.skip('NotificationWithRelationsSchema', () => {
    it.skip('should accept notification with relations', () => {
      const notificationWithRelations = {
        ...validNotification,
        sender: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          avatarUrl: 'https://example.com/avatar.jpg'
        },
        conversation: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          participantIds: ['123e4567-e89b-12d3-a456-426614174001', '123e4567-e89b-12d3-a456-426614174002'],
          lastActivityAt: new Date('2024-01-01T00:00:00Z')
        }
      };

      const result = NotificationWithRelationsSchema.safeParse(notificationWithRelations);
      expect(result.success).toBe(true);
    });

    it.skip('should accept notification without relations', () => {
      const result = NotificationWithRelationsSchema.safeParse(validNotification);
      expect(result.success).toBe(true);
    });

    it.skip('should validate sender email format', () => {
      const withInvalidEmail = {
        ...validNotification,
        sender: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          firstName: 'John',
          email: 'invalid-email'
        }
      };

      const result = NotificationWithRelationsSchema.safeParse(withInvalidEmail);
      expect(result.success).toBe(false);
    });
  });

  describe.skip('Database Transformations', () => {
    it.skip('should transform to snake_case for database', () => {
      const result = NotificationDbSchema.safeParse(validNotification);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('user_id');
        expect(result.data).toHaveProperty('created_at');
        expect(result.data).toHaveProperty('updated_at');
        expect(result.data).not.toHaveProperty('userId');
        expect(result.data).not.toHaveProperty('createdAt');
      }
    });

    it.skip('should transform from snake_case from database', () => {
      const dbData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'message',
        title: 'New message',
        content: 'You have a new message',
        data: { sender_id: '123e4567-e89b-12d3-a456-426614174002' },
        read: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const result = NotificationFromDbSchema.safeParse(dbData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('userId');
        expect(result.data).toHaveProperty('createdAt');
        expect(result.data).toHaveProperty('updatedAt');
        expect(result.data.createdAt).toBeInstanceOf(Date);
        expect(result.data.updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe.skip('NotificationFilterSchema', () => {
    it.skip('should set default values', () => {
      const result = NotificationFilterSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(20);
      }
    });

    it.skip('should validate pagination constraints', () => {
      const invalidPage = { page: 0 };
      expect(NotificationFilterSchema.safeParse(invalidPage).success).toBe(false);

      const invalidPageSize = { pageSize: 0 };
      expect(NotificationFilterSchema.safeParse(invalidPageSize).success).toBe(false);

      const tooLargePageSize = { pageSize: 101 };
      expect(NotificationFilterSchema.safeParse(tooLargePageSize).success).toBe(false);
    });

    it.skip('should accept valid filter options', () => {
      const filters = {
        userId: '123e4567-e89b-12d3-a456-426614174001',
        type: 'message' as const,
        read: true,
        page: 2,
        pageSize: 50,
        since: new Date('2024-01-01T00:00:00Z')
      };

      const result = NotificationFilterSchema.safeParse(filters);
      expect(result.success).toBe(true);
    });
  });
});