import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useClient } from '../../auth/providers/CurrentUserProvider';
import { createNotificationService } from '../services/notification.service';
import type { 
  NotificationList, 
  NotificationWithRelations, 
  NotificationFilter,
  NotificationCreate 
} from '@belongnetwork/types/schemas';

/**
 * Consolidated Notifications Hook
 * Following the new architecture pattern of single hook per entity
 * Returns object with all notification operations (queries and mutations)
 */
export function useNotifications(userId?: string) {
  const queryClient = useQueryClient();
  const client = useClient();
  const notificationService = createNotificationService(client);

  // List notifications query
  const notificationsQuery = useQuery<NotificationList[], Error>({
    queryKey: ['notifications', userId],
    queryFn: () => {
      if (!userId) throw new Error('User ID required');
      return notificationService.fetchNotifications(userId);
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds (notifications change frequently)
  });

  // Filtered notifications query function
  const getNotifications = (filters?: NotificationFilter) => {
    return useQuery<NotificationList[], Error>({
      queryKey: ['notifications', userId, filters],
      queryFn: () => {
        if (!userId) throw new Error('User ID required');
        return notificationService.fetchNotifications(userId, filters);
      },
      enabled: !!userId,
      staleTime: 30 * 1000,
    });
  };

  // Single notification query function
  const getNotification = (notificationId: string) => {
    return useQuery<NotificationWithRelations | null, Error>({
      queryKey: ['notification', notificationId],
      queryFn: () => {
        if (!userId) throw new Error('User ID required');
        return notificationService.fetchNotificationById(notificationId, userId);
      },
      enabled: !!notificationId && !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Create notification mutation
  const createMutation = useMutation({
    mutationFn: (data: NotificationCreate) => 
      notificationService.createNotification(data),
    onSuccess: () => {
      // Invalidate all notification queries for this user
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!userId) throw new Error('User ID required');
      return notificationService.markNotificationRead(notificationId, userId);
    },
    onSuccess: (_, notificationId) => {
      // Invalidate notification lists and the specific notification
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
      queryClient.invalidateQueries({ queryKey: ['notification', notificationId] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('User ID required');
      return notificationService.markAllNotificationsRead(userId);
    },
    onSuccess: () => {
      // Invalidate all notification queries for this user
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!userId) throw new Error('User ID required');
      return notificationService.deleteNotification(notificationId, userId);
    },
    onSuccess: (_, notificationId) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: ['notification', notificationId] });
      queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
    },
  });

  return {
    // Query results
    notifications: notificationsQuery.data,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    
    // Query functions
    getNotifications,
    getNotification,
    
    // Mutations
    create: createMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    
    // Mutation states
    isCreating: createMutation.isPending,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    
    // Computed values
    unreadCount: notificationsQuery.data?.filter(n => !n.read).length ?? 0,
    hasUnread: (notificationsQuery.data?.some(n => !n.read)) ?? false,
    
    // Sync mutations (don't return promises)
    markAsReadSync: markAsReadMutation.mutate,
    markAllAsReadSync: markAllAsReadMutation.mutate,
    deleteSync: deleteMutation.mutate,
  };
}