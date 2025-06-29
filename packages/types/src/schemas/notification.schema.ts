import { z } from 'zod';
import { caseTransform } from '../utils/transformers';

/**
 * Notification Schema - Single source of truth for notification types
 * Auto-generates all TypeScript types and database transformations
 */

// Base notification schema with domain field names (camelCase)
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['message', 'mention', 'system']),
  title: z.string().min(1).max(255),
  content: z.string().max(1000).optional(),
  data: z.record(z.any()).optional(), // JSON data
  read: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Create/input schema (omit auto-generated fields)
export const NotificationCreateSchema = NotificationSchema
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  });

// Update schema (all fields optional except type constraints)
export const NotificationUpdateSchema = NotificationCreateSchema
  .partial()
  .extend({
    read: z.boolean().optional()
  });

// Schema for list items (lightweight version)
export const NotificationListSchema = NotificationSchema.extend({
  // Extract IDs from data for list displays
  senderId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  messageId: z.string().uuid().optional()
}).transform(data => ({
  ...data,
  senderId: (data.data as any)?.senderId,
  conversationId: (data.data as any)?.conversationId,
  messageId: (data.data as any)?.messageId
}));

// Schema for single items with relations
export const NotificationWithRelationsSchema = NotificationSchema.extend({
  // Full related objects for detailed views
  sender: z.object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string().optional(),
    email: z.string().email(),
    avatarUrl: z.string().url().optional()
  }).optional(),
  conversation: z.object({
    id: z.string().uuid(),
    participantIds: z.array(z.string().uuid()),
    lastActivityAt: z.date()
  }).optional(),
  message: z.object({
    id: z.string().uuid(),
    content: z.string(),
    fromUserId: z.string().uuid(),
    toUserId: z.string().uuid(),
    createdAt: z.date()
  }).optional()
});

// Database schemas with automatic case transformation
export const NotificationDbSchema = NotificationSchema.transform(caseTransform.toSnakeCase);

// Transform from database with date parsing
export const NotificationFromDbSchema = z.any()
  .transform(caseTransform.toCamelCase)
  .transform((data: any) => ({
    ...data,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date()
  }))
  .pipe(NotificationSchema);

// Filter schema for queries
export const NotificationFilterSchema = z.object({
  userId: z.string().uuid().optional(),
  type: z.enum(['message', 'mention', 'system']).optional(),
  read: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  since: z.date().optional()
});

// Type inference - these become the exported TypeScript types
export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationCreate = z.infer<typeof NotificationCreateSchema>;
export type NotificationUpdate = z.infer<typeof NotificationUpdateSchema>;
export type NotificationList = z.infer<typeof NotificationListSchema>;
export type NotificationWithRelations = z.infer<typeof NotificationWithRelationsSchema>;
export type NotificationFilter = z.infer<typeof NotificationFilterSchema>;

// Database types for internal use
export type NotificationDb = z.infer<typeof NotificationDbSchema>;

// Legacy compatibility - for gradual migration
export type NotificationData = NotificationCreate;
export type NotificationInfo = NotificationList;