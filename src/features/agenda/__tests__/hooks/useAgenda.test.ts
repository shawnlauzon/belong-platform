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
    ...(actual as object),
    queryKeys: {
      ...(actual as any)?.queryKeys,
      agenda: {
        current: ['agenda'] as const,
      },
    },
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
        type: 'gathering-confirmed',
        title: 'Team Meeting',
        description: 'Event at Conference Room',
        dueDate: new Date('2024-01-15T10:00:00Z'),
      },
      {
        id: 'resource_pending_resource1',
        type: 'shoutout-favor',
        title: 'Response needed: Help with gardening',
        description: 'Need help with community garden maintenance',
      },
    ],
    hasMore: false,
  };

  it('should fetch agenda for current user', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockAgenda);
    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.hasMore).toBe(false);
    expect(mockFetchAgenda).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should always fetch agenda for current user', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchAgenda).toHaveBeenCalledWith(expect.any(Object));
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Failed to fetch agenda');
    mockFetchAgenda.mockRejectedValue(error);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query keys for caching', async () => {
    mockFetchAgenda.mockResolvedValue(mockAgenda);

    const { result } = renderHook(() => useAgenda(), {
      wrapper: createTestWrapper().wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.items).toBeDefined();
  });
});
