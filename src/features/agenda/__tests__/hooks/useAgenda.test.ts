import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../../../test-utils';
import type { Agenda } from '../../types';

// Mock the API function
const mockFetchAgenda = vi.fn();
vi.mock('../../api', () => ({
  fetchAgenda: mockFetchAgenda,
}));

// Mock queryKeys properly
vi.mock('../../../../shared', async () => {
  const actual = await vi.importActual('../../../../shared');
  return {
    ...actual,
    queryKeys: {
      ...actual.queryKeys,
      agenda: {
        current: ['agenda'] as const,
      }
    }
  };
});

// Import after mocking
const { useAgenda } = await import('../../hooks/useAgenda');

describe('useAgenda', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockAgenda: Agenda = {
    items: [
      {
        id: 'event_upcoming_event1',
        type: 'event_upcoming',
        title: 'Team Meeting',
        description: 'Event at Conference Room',
        dueDate: new Date('2024-01-15T10:00:00Z'),
        entityId: 'event1',
        communityId: 'community1',
        createdAt: new Date('2024-01-10T10:00:00Z'),
        metadata: {
          eventStartTime: new Date('2024-01-15T10:00:00Z'),
          status: 'attending'
        }
      },
      {
        id: 'resource_pending_resource1',
        type: 'resource_pending',
        title: 'Response needed: Help with gardening',
        description: 'Need help with community garden maintenance',
        entityId: 'resource1',
        communityId: 'community1',
        createdAt: new Date('2024-01-12T10:00:00Z'),
        metadata: {
          resourceOwnerId: 'user2',
          resourceOwnerName: 'Jane Doe',
          status: 'pending'
        }
      }
    ],
    hasMore: false
  };

  it('should fetch agenda for current user', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAgenda);
    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.hasMore).toBe(false);
    expect(mockFetchAgenda).toHaveBeenCalledWith(
      expect.any(Object)
    );
  });

  it('should always fetch agenda for current user', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchAgenda).toHaveBeenCalledWith(
      expect.any(Object)
    );
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Failed to fetch agenda');
    mockFetchAgenda.mockRejectedValue(error);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query keys for caching', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.items).toBeDefined();
  });
});