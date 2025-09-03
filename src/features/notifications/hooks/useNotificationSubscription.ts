import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getCurrentUserId } from '@/features/auth/api';
import { notificationKeys } from '../queries';
import type { Notification } from '../types/notification';
import type { NotificationCounts } from '../types/notificationCounts';

export interface UseNotificationSubscriptionOptions {
  onNewNotification?: (notification: Notification) => void;
  onCountChange?: (counts: NotificationCounts) => void;
  onNotificationRead?: (notificationId: string) => void;
}

export function useNotificationSubscription(
  options: UseNotificationSubscriptionOptions = {}
) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { onNewNotification, onCountChange, onNotificationRead } = options;

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    const setupSubscription = async () => {
      try {
        const userId = await getCurrentUserId(supabase);
        if (!userId) return;

        channel = supabase.channel(`user:${userId}:notifications`);

        // Subscribe to new notifications
        channel
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            // Invalidate notification lists
            queryClient.invalidateQueries({
              queryKey: notificationKeys.lists(),
            });
            
            // Invalidate counts
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });

            // Call callback with transformed notification
            if (onNewNotification && payload.new) {
              try {
                // Transform the raw database row to a domain notification
                // Note: Real-time payloads don't include joins, so we create a basic notification
                const basicNotification: Notification = {
                  id: payload.new.id,
                  userId: payload.new.user_id,
                  type: payload.new.type as Notification['type'],
                  resourceId: payload.new.resource_id || undefined,
                  commentId: payload.new.comment_id || undefined,
                  claimId: payload.new.claim_id || undefined,
                  messageId: payload.new.message_id || undefined,
                  conversationId: payload.new.conversation_id || undefined,
                  communityId: payload.new.community_id || undefined,
                  actorId: payload.new.actor_id,
                  actorName: undefined, // Will be loaded via regular query
                  actorAvatarUrl: undefined,
                  groupKey: payload.new.group_key || undefined,
                  actorCount: payload.new.actor_count || 1,
                  title: payload.new.title,
                  body: payload.new.body || undefined,
                  imageUrl: payload.new.image_url || undefined,
                  actionUrl: payload.new.action_url || undefined,
                  metadata: payload.new.metadata || {},
                  isRead: payload.new.is_read || false,
                  readAt: payload.new.read_at ? new Date(payload.new.read_at) : undefined,
                  createdAt: new Date(payload.new.created_at),
                  updatedAt: new Date(payload.new.updated_at),
                };
                onNewNotification(basicNotification);
              } catch (error) {
                console.error('Error transforming real-time notification:', error);
              }
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            // Handle read status updates
            queryClient.invalidateQueries({
              queryKey: notificationKeys.lists(),
            });
            
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });

            if (onNotificationRead && payload.new?.is_read && payload.new.id) {
              onNotificationRead(payload.new.id);
            }
          })
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'notification_counts',
            filter: `user_id=eq.${userId}`,
          }, (payload) => {
            // Update counts when notification_counts table changes
            queryClient.invalidateQueries({
              queryKey: notificationKeys.counts(),
            });

            // Call callback with count changes
            if (onCountChange && payload.new) {
              try {
                const counts: NotificationCounts = {
                  total: payload.new.unread_total || 0,
                  notifications: payload.new.unread_total || 0,
                  messages: 0, // Messages are handled separately
                  comments: payload.new.unread_comments || 0,
                  claims: payload.new.unread_claims || 0,
                  resources: payload.new.unread_resources || 0,
                };
                onCountChange(counts);
              } catch (error) {
                console.error('Error handling count change:', error);
              }
            }
          })
          .subscribe((_, err) => {
            if (err) {
              console.error('Error subscribing to notification channel:', err);
            }
          });

      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, queryClient, onNewNotification, onCountChange, onNotificationRead]);
}