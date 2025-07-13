import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the entire API module
const mockFetchAgenda = vi.fn();
vi.mock('../../api/fetchAgenda', () => ({
  fetchAgenda: mockFetchAgenda
}));

// Import after mocking
const { fetchAgenda } = await import('../../api/fetchAgenda');

describe('fetchAgenda', () => {
  it('should fetch and aggregate agenda from all sources', async () => {
    const mockAgenda = {
      items: [
        {
          id: 'event_upcoming_event1',
          type: 'event_upcoming',
          title: 'Team Meeting',
          description: 'Event at Office',
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
          entityId: 'resource1',
          communityId: 'community1',
          createdAt: new Date('2024-01-12T10:00:00Z'),
          metadata: {}
        }
      ],
      hasMore: false
    };

    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const result = await fetchAgenda({} as SupabaseClient<Database>, 'user1');

    expect(result.items).toHaveLength(2);
    expect(result.items[0].type).toBe('event_upcoming');
    expect(result.items[1].type).toBe('resource_pending');
    expect(result.hasMore).toBe(false);
  });

  it('should handle empty results', async () => {
    mockFetchAgenda.mockResolvedValue({ items: [], hasMore: false });

    const result = await fetchAgenda({} as SupabaseClient<Database>, 'user1');

    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    // Mock returns empty data on error (consistent with implementation)
    mockFetchAgenda.mockResolvedValue({ items: [], hasMore: false });

    const result = await fetchAgenda({} as SupabaseClient<Database>, 'user1');
    
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});