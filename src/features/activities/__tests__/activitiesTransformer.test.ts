import { describe, it, expect } from 'vitest';
import {
  transformEventsToActivities,
  transformResourcesToActivities,
  transformShoutoutsToActivities,
  transformMessagesToActivities
} from '../transformers/activitiesTransformer';

describe('activitiesTransformer', () => {
  describe('transformEventsToActivities', () => {
    it('should transform event attendances to activity info', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const futureEndDate = new Date(futureDate.getTime() + 60 * 60 * 1000); // 1 hour later

      const eventAttendances = [
        {
          event_id: 'event1',
          user_id: 'user1',
          status: 'attending',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          event: {
            id: 'event1',
            title: 'Community Meeting',
            description: 'Monthly community gathering',
            location_name: 'Community Center',
            community_id: 'community1',
            start_date_time: futureDate.toISOString(),
            end_date_time: futureEndDate.toISOString()
          }
        }
      ];

      const result = transformEventsToActivities(eventAttendances);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('event_upcoming_event1');
      expect(result[0].type).toBe('event_upcoming');
      expect(result[0].title).toBe('Community Meeting');
      expect(result[0].description).toBe('Event at Community Center');
      expect(result[0].urgencyLevel).toBe('normal');
      expect(result[0].entityId).toBe('event1');
      expect(result[0].communityId).toBe('community1');
    });

    it('should calculate urgency correctly for events', () => {
      const now = new Date();
      const urgentEventTime = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now
      const soonEventTime = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now
      const normalEventTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const eventAttendances = [
        {
          event_id: 'urgent_event',
          user_id: 'user1',
          status: 'attending',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          event: {
            id: 'urgent_event',
            title: 'Urgent Event',
            location_name: 'Office',
            community_id: 'community1',
            start_date_time: urgentEventTime.toISOString(),
            end_date_time: null
          }
        },
        {
          event_id: 'soon_event',
          user_id: 'user1',
          status: 'maybe',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          event: {
            id: 'soon_event',
            title: 'Soon Event',
            location_name: 'Park',
            community_id: 'community1',
            start_date_time: soonEventTime.toISOString(),
            end_date_time: null
          }
        },
        {
          event_id: 'normal_event',
          user_id: 'user1',
          status: 'attending',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z',
          event: {
            id: 'normal_event',
            title: 'Normal Event',
            location_name: 'Library',
            community_id: 'community1',
            start_date_time: normalEventTime.toISOString(),
            end_date_time: null
          }
        }
      ];

      const result = transformEventsToActivities(eventAttendances);

      expect(result[0].urgencyLevel).toBe('urgent');
      expect(result[1].urgencyLevel).toBe('soon');
      expect(result[2].urgencyLevel).toBe('normal');
    });
  });

  describe('transformResourcesToActivities', () => {
    it('should transform pending resource responses to activity info', () => {
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const resourceResponses = [
        {
          resource_id: 'resource1',
          user_id: 'user1',
          status: 'pending',
          created_at: recentDate.toISOString(),
          resource: {
            id: 'resource1',
            title: 'Help with gardening',
            description: 'Need help maintaining the community garden',
            community_id: 'community1',
            owner_id: 'user2',
            owner: {
              id: 'user2',
              email: 'jane@example.com',
              user_metadata: { full_name: 'Jane Doe' }
            }
          }
        }
      ];

      const result = transformResourcesToActivities(resourceResponses);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('resource_pending_resource1');
      expect(result[0].type).toBe('resource_pending');
      expect(result[0].title).toBe('Response needed: Help with gardening');
      expect(result[0].description).toBe('Need help maintaining the community garden');
      expect(result[0].urgencyLevel).toBe('normal');
      expect(result[0].entityId).toBe('resource1');
      expect(result[0].communityId).toBe('community1');
    });

    it('should transform accepted resource responses to activity info', () => {
      const resourceResponses = [
        {
          resource_id: 'resource1',
          user_id: 'user1',
          status: 'accepted',
          created_at: '2024-01-10T10:00:00Z',
          resource: {
            id: 'resource1',
            title: 'Bike repair',
            description: 'Fix bicycle chain',
            community_id: 'community1',
            owner_id: 'user2',
            owner: {
              id: 'user2',
              email: 'jane@example.com',
              user_metadata: { full_name: 'Jane Doe' }
            }
          }
        }
      ];

      const result = transformResourcesToActivities(resourceResponses);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'resource_accepted_resource1',
        type: 'resource_accepted',
        title: 'Helping with: Bike repair',
        description: 'Fix bicycle chain',
        urgencyLevel: 'normal',
        entityId: 'resource1',
        communityId: 'community1',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        metadata: {
          resourceOwnerId: 'user2',
          resourceOwnerName: 'Jane Doe',
          status: 'accepted'
        }
      });
    });

    it('should calculate urgency correctly for pending resources', () => {
      const now = new Date();
      const oldResponse = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      const mediumResponse = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000); // 4 days ago
      const recentResponse = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago

      const resourceResponses = [
        {
          resource_id: 'old_resource',
          user_id: 'user1',
          status: 'pending',
          created_at: oldResponse.toISOString(),
          resource: {
            id: 'old_resource',
            title: 'Old Request',
            description: 'Old request',
            community_id: 'community1',
            owner_id: 'user2',
            owner: { id: 'user2', email: 'user2@example.com', user_metadata: {} }
          }
        },
        {
          resource_id: 'medium_resource',
          user_id: 'user1',
          status: 'pending',
          created_at: mediumResponse.toISOString(),
          resource: {
            id: 'medium_resource',
            title: 'Medium Request',
            description: 'Medium request',
            community_id: 'community1',
            owner_id: 'user2',
            owner: { id: 'user2', email: 'user2@example.com', user_metadata: {} }
          }
        },
        {
          resource_id: 'recent_resource',
          user_id: 'user1',
          status: 'pending',
          created_at: recentResponse.toISOString(),
          resource: {
            id: 'recent_resource',
            title: 'Recent Request',
            description: 'Recent request',
            community_id: 'community1',
            owner_id: 'user2',
            owner: { id: 'user2', email: 'user2@example.com', user_metadata: {} }
          }
        }
      ];

      const result = transformResourcesToActivities(resourceResponses);

      expect(result[0].urgencyLevel).toBe('urgent'); // 8 days old
      expect(result[1].urgencyLevel).toBe('soon');   // 4 days old
      expect(result[2].urgencyLevel).toBe('normal'); // 1 day old
    });
  });

  describe('transformShoutoutsToActivities', () => {
    it('should transform pending shoutout opportunities to activity info', () => {
      const recentDate = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

      const pendingShoutouts = [
        {
          resource_id: 'resource1',
          user_id: 'user1',
          status: 'completed',
          updated_at: recentDate.toISOString(),
          resource: {
            id: 'resource1',
            title: 'Bike repair',
            description: 'Fixed bicycle chain',
            community_id: 'community1',
            owner_id: 'user2',
            owner: {
              id: 'user2',
              email: 'jane@example.com',
              user_metadata: { full_name: 'Jane Doe' }
            }
          }
        }
      ];

      const result = transformShoutoutsToActivities(pendingShoutouts);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('shoutout_pending_resource1');
      expect(result[0].type).toBe('shoutout_pending');
      expect(result[0].title).toBe('Give shoutout for: Bike repair');
      expect(result[0].description).toBe('Thank Jane Doe for their help');
      expect(result[0].urgencyLevel).toBe('normal');
      expect(result[0].entityId).toBe('resource1');
      expect(result[0].communityId).toBe('community1');
    });
  });

  describe('transformMessagesToActivities', () => {
    it('should transform unread messages to activity info', () => {
      const recentDate = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours ago

      const messages = [
        {
          id: 'message1',
          content: 'Hey, how are you doing?',
          from_user_id: 'user2',
          to_user_id: 'user1',
          created_at: recentDate.toISOString(),
          from_user: {
            id: 'user2',
            email: 'john@example.com',
            user_metadata: { full_name: 'John Doe' }
          }
        }
      ];

      const result = transformMessagesToActivities(messages);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('message_unread_message1');
      expect(result[0].type).toBe('message_unread');
      expect(result[0].title).toBe('Message from John Doe');
      expect(result[0].description).toBe('Hey, how are you doing?');
      expect(result[0].urgencyLevel).toBe('normal');
      expect(result[0].entityId).toBe('message1');
      expect(result[0].communityId).toBe('');
    });

    it('should truncate long message content', () => {
      const longContent = 'A'.repeat(150);
      const messages = [
        {
          id: 'message1',
          content: longContent,
          from_user_id: 'user2',
          to_user_id: 'user1',
          created_at: '2024-01-10T10:00:00Z',
          from_user: {
            id: 'user2',
            email: 'john@example.com',
            user_metadata: { name: 'John Doe' }
          }
        }
      ];

      const result = transformMessagesToActivities(messages);

      expect(result[0].description).toHaveLength(103); // 100 chars + '...'
      expect(result[0].description.endsWith('...')).toBe(true);
    });

    it('should handle missing user metadata gracefully', () => {
      const messages = [
        {
          id: 'message1',
          content: 'Hello',
          from_user_id: 'user2',
          to_user_id: 'user1',
          created_at: '2024-01-10T10:00:00Z',
          from_user: {
            id: 'user2',
            email: 'john@example.com',
            user_metadata: {}
          }
        }
      ];

      const result = transformMessagesToActivities(messages);

      expect(result[0].title).toBe('Message from john@example.com');
      expect(result[0].metadata.fromUserName).toBe('john@example.com');
    });
  });
});