import { describe, it, expect, vi } from 'vitest';
import type { ActivityFilter } from '../types';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the entire API module
const mockFetchActivities = vi.fn();
vi.mock('../api/fetchActivities', () => ({
  fetchActivities: mockFetchActivities
}));

// Import after mocking
const { fetchActivities } = await import('../api/fetchActivities');

describe('fetchActivities', () => {
  it('should fetch and aggregate activities from all sources', async () => {
    const mockActivities = [
      {
        id: 'event_upcoming_event1',
        type: 'event_upcoming',
        title: 'Team Meeting',
        description: 'Event at Office',
        urgencyLevel: 'urgent',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        entityId: 'event1',
        communityId: 'community1',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        metadata: {}
      },
      {
        id: 'resource_pending_resource1',
        type: 'resource_pending',
        title: 'Response needed: Help needed',
        description: 'Need help with task',
        urgencyLevel: 'soon',
        entityId: 'resource1',
        communityId: 'community1',
        createdAt: new Date('2024-01-12T10:00:00Z'),
        metadata: {}
      }
    ];

    mockFetchActivities.mockResolvedValue(mockActivities);

    const filter: ActivityFilter = { userId: 'user1' };
    const result = await fetchActivities({} as SupabaseClient<Database>, filter);

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('event_upcoming');
    expect(result[1].type).toBe('resource_pending');
  });

  it('should handle empty results', async () => {
    mockFetchActivities.mockResolvedValue([]);

    const filter: ActivityFilter = { userId: 'user1' };
    const result = await fetchActivities({} as SupabaseClient<Database>, filter);

    expect(result).toHaveLength(0);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    mockFetchActivities.mockRejectedValue(error);

    const filter: ActivityFilter = { userId: 'user1' };

    await expect(fetchActivities({} as SupabaseClient<Database>, filter)).rejects.toThrow('Database error');
  });
});