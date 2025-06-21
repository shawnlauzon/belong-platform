import { type BelongClient } from '@belongnetwork/core';
import type { Database } from '@belongnetwork/types';
import { 
  NotificationSchema,
  NotificationCreateSchema,
  NotificationUpdateSchema,
  NotificationListSchema,
  NotificationWithRelationsSchema,
  NotificationFromDbSchema,
  NotificationDbSchema,
  NotificationFilterSchema,
  type Notification,
  type NotificationList,
  type NotificationWithRelations,
  type NotificationFilter,
  caseTransform
} from '@belongnetwork/types/schemas';
import { z } from 'zod';
import { fetchUserById } from '../../users/impl/fetchUserById';

/**
 * Notification Service Factory
 * Creates notification service with the provided BelongClient
 * Uses Zod schemas for all data validation and transformation
 */
export const createNotificationService = (client: BelongClient) => ({
  /**
   * Fetch notifications for a user with optional filtering
   * Returns list of notifications with basic info
   */
  async fetchNotifications(
    userId: string, 
    filters?: NotificationFilter
  ): Promise<NotificationList[]> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Fetching notifications', { userId, filters });

    try {
      // Validate and set defaults for filters
      const validatedFilters = filters ? NotificationFilterSchema.parse(filters) : NotificationFilterSchema.parse({});
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters
      if (validatedFilters.type) {
        query = query.eq('type', validatedFilters.type);
      }
      
      if (validatedFilters.read !== undefined) {
        query = query.eq('read', validatedFilters.read);
      }
      
      if (validatedFilters.since) {
        query = query.gte('created_at', validatedFilters.since.toISOString());
      }

      // Apply pagination
      const offset = (validatedFilters.page - 1) * validatedFilters.pageSize;
      query = query.range(offset, offset + validatedFilters.pageSize - 1);

      const { data, error } = await query;
      
      if (error) {
        logger.error('🔔 API: Failed to fetch notifications', { error, userId });
        throw error;
      }

      // Transform using Zod schema
      const notifications = z.array(NotificationFromDbSchema).parse(data || []);
      
      // Convert to list format with extracted IDs
      const notificationList = notifications.map(notification => 
        NotificationListSchema.parse(notification)
      );

      logger.info('🔔 API: Successfully fetched notifications', { 
        userId, 
        count: notificationList.length 
      });
      
      return notificationList;
    } catch (error) {
      logger.error('🔔 API: Error fetching notifications', { error, userId });
      throw error;
    }
  },

  /**
   * Fetch a single notification by ID with full relations
   * Uses cache assembly pattern for related data
   */
  async fetchNotificationById(
    notificationId: string,
    userId: string
  ): Promise<NotificationWithRelations | null> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Fetching notification by ID', { notificationId, userId });

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', notificationId)
        .eq('user_id', userId) // Security: only fetch user's own notifications
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') { // Not found
          logger.debug('🔔 API: Notification not found', { notificationId, userId });
          return null;
        }
        logger.error('🔔 API: Failed to fetch notification', { error, notificationId });
        throw error;
      }

      // Transform base notification
      const notification = NotificationFromDbSchema.parse(data);
      
      // Assemble related data if available
      let sender, conversation, message;
      
      if (notification.data?.senderId) {
        sender = await fetchUserById(notification.data.senderId);
      }
      
      // Note: Conversation and message assembly would go here
      // For now, we'll leave them undefined since those services aren't implemented yet
      
      const notificationWithRelations = NotificationWithRelationsSchema.parse({
        ...notification,
        sender,
        conversation,
        message
      });

      logger.info('🔔 API: Successfully fetched notification', { notificationId });
      return notificationWithRelations;
    } catch (error) {
      logger.error('🔔 API: Error fetching notification', { error, notificationId });
      throw error;
    }
  },

  /**
   * Create a new notification
   * Validates input data using Zod schema
   */
  async createNotification(input: unknown): Promise<Notification> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Creating notification', { input });

    try {
      // Validate input using Zod schema
      const validatedData = NotificationCreateSchema.parse(input);
      
      // Transform to database format (omit auto-generated fields)
      const dbData = caseTransform.toSnakeCase(validatedData);
      
      const { data, error } = await supabase
        .from('notifications')
        .insert(dbData)
        .select()
        .single();
        
      if (error) {
        logger.error('🔔 API: Failed to create notification', { error, input });
        throw error;
      }

      // Transform back to domain format
      const notification = NotificationFromDbSchema.parse(data);
      
      logger.info('🔔 API: Successfully created notification', { 
        id: notification.id,
        userId: notification.userId 
      });
      
      return notification;
    } catch (error) {
      logger.error('🔔 API: Error creating notification', { error, input });
      throw error;
    }
  },

  /**
   * Mark notification as read
   */
  async markNotificationRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Marking notification as read', { notificationId, userId });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', userId); // Security: only update user's own notifications
        
      if (error) {
        logger.error('🔔 API: Failed to mark notification as read', { error, notificationId });
        throw error;
      }

      logger.info('🔔 API: Successfully marked notification as read', { notificationId });
    } catch (error) {
      logger.error('🔔 API: Error marking notification as read', { error, notificationId });
      throw error;
    }
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsRead(userId: string): Promise<void> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Marking all notifications as read', { userId });

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false); // Only update unread notifications
        
      if (error) {
        logger.error('🔔 API: Failed to mark all notifications as read', { error, userId });
        throw error;
      }

      logger.info('🔔 API: Successfully marked all notifications as read', { userId });
    } catch (error) {
      logger.error('🔔 API: Error marking all notifications as read', { error, userId });
      throw error;
    }
  },

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    const { supabase, logger } = client;
    
    logger.debug('🔔 API: Deleting notification', { notificationId, userId });

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId); // Security: only delete user's own notifications
        
      if (error) {
        logger.error('🔔 API: Failed to delete notification', { error, notificationId });
        throw error;
      }

      logger.info('🔔 API: Successfully deleted notification', { notificationId });
    } catch (error) {
      logger.error('🔔 API: Error deleting notification', { error, notificationId });
      throw error;
    }
  }
});