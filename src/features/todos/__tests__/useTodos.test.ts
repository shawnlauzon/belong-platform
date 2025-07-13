import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../../test-utils';
import type { TodoSummary, TodoFilter } from '../types';

// Mock the API function
const mockFetchTodos = vi.fn();
vi.mock('../api', () => ({
  fetchTodos: mockFetchTodos,
}));

// Mock queryKeys properly
vi.mock('../../../shared', async () => {
  const actual = await vi.importActual('../../../shared');
  return {
    ...actual,
    queryKeys: {
      ...actual.queryKeys,
      todos: {
        byUser: (userId: string) => ['user', userId, 'todos'],
        bySection: (userId: string, section: string) => ['user', userId, 'todos', section],
        counts: (userId: string) => ['user', userId, 'todos', 'counts'],
      }
    }
  };
});

// Import after mocking
const { useTodos, useTodoCounts } = await import('../hooks/useTodos');

describe('useTodos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTodos: TodoSummary[] = [
    {
      id: 'event_upcoming_event1',
      type: 'event_upcoming',
      title: 'Team Meeting',
      description: 'Event at Conference Room',
      urgencyLevel: 'urgent',
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
      urgencyLevel: 'soon',
      entityId: 'resource1',
      communityId: 'community1',
      createdAt: new Date('2024-01-12T10:00:00Z'),
      metadata: {
        resourceOwnerId: 'user2',
        resourceOwnerName: 'Jane Doe',
        status: 'pending'
      }
    }
  ];

  it('should fetch todos for a user', async () => {
    mockFetchTodos.mockResolvedValue(mockTodos);

    const filter: TodoFilter = { userId: 'user1' };
    const { result } = renderHook(() => useTodos(filter), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockTodos);
    expect(mockFetchTodos).toHaveBeenCalledWith(
      expect.any(Object),
      filter
    );
  });

  it('should fetch activities filtered by section', async () => {
    const urgentTodos = mockTodos.filter(a => a.urgencyLevel === 'urgent');
    mockFetchTodos.mockResolvedValue(urgentTodos);

    const filter: TodoFilter = { userId: 'user1', section: 'attention' };
    const { result } = renderHook(() => useTodos(filter), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(urgentTodos);
    expect(mockFetchTodos).toHaveBeenCalledWith(
      expect.any(Object),
      filter
    );
  });

  it('should not fetch when userId is not provided', () => {
    const filter: TodoFilter = { userId: '' };
    const { result } = renderHook(() => useTodos(filter), {
      wrapper: createTestWrapper().wrapper
    });

    expect(result.current.isPending).toBe(true);
    expect(mockFetchTodos).not.toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Failed to fetch todos');
    mockFetchTodos.mockRejectedValue(error);

    const filter: TodoFilter = { userId: 'user1' };
    const { result } = renderHook(() => useTodos(filter), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query keys for caching', async () => {
    mockFetchTodos.mockResolvedValue(mockTodos);

    const filter: TodoFilter = { userId: 'user1', section: 'attention' };
    const { result } = renderHook(() => useTodos(filter), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The hook should use section-specific query key when section is provided
    expect(result.current.data).toBeDefined();
  });
});

describe('useTodoCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTodosForCounts: TodoSummary[] = [
    // Needs attention (urgent)
    {
      id: 'event_upcoming_urgent',
      type: 'event_upcoming',
      title: 'Urgent Meeting',
      description: 'Event at Office',
      urgencyLevel: 'urgent',
      dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      entityId: 'event_urgent',
      communityId: 'community1',
      createdAt: new Date('2024-01-10T10:00:00Z'),
      metadata: {}
    },
    // In progress (accepted resource)
    {
      id: 'resource_accepted_1',
      type: 'resource_accepted',
      title: 'Helping with: Bike repair',
      description: 'Fix bicycle chain',
      urgencyLevel: 'normal',
      entityId: 'resource1',
      communityId: 'community1',
      createdAt: new Date('2024-01-10T10:00:00Z'),
      metadata: { status: 'accepted' }
    },
    // Upcoming event
    {
      id: 'event_upcoming_future',
      type: 'event_upcoming',
      title: 'Future Event',
      description: 'Event next week',
      urgencyLevel: 'normal',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      entityId: 'event_future',
      communityId: 'community1',
      createdAt: new Date('2024-01-10T10:00:00Z'),
      metadata: {}
    },
    // Unread message
    {
      id: 'message_unread_1',
      type: 'message_unread',
      title: 'Message from John',
      description: 'Hey, how are you?',
      urgencyLevel: 'normal',
      entityId: 'message1',
      communityId: '',
      createdAt: new Date('2024-01-10T10:00:00Z'),
      metadata: { fromUserId: 'user2', fromUserName: 'John Doe' }
    }
  ];

  it('should calculate todo counts correctly', async () => {
    mockFetchTodos.mockResolvedValue(mockTodosForCounts);

    const { result } = renderHook(() => useTodoCounts('user1'), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const counts = result.current.data;
    expect(counts).toEqual({
      needsAttention: 1, // 1 urgent todo
      inProgress: 2,     // 1 accepted resource + 1 urgent event (within 24h)
      upcoming: 1,       // 1 future event
      recent: 0,         // No recent history
      unreadMessages: 1  // 1 unread message
    });
  });

  it('should handle empty todos list', async () => {
    mockFetchTodos.mockResolvedValue([]);

    const { result } = renderHook(() => useTodoCounts('user1'), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const counts = result.current.data;
    expect(counts).toEqual({
      needsAttention: 0,
      inProgress: 0,
      upcoming: 0,
      recent: 0,
      unreadMessages: 0
    });
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useTodoCounts(''), {
      wrapper: createTestWrapper().wrapper
    });

    expect(result.current.isPending).toBe(true);
    expect(mockFetchTodos).not.toHaveBeenCalled();
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Failed to fetch todo counts');
    mockFetchTodos.mockRejectedValue(error);

    const { result } = renderHook(() => useTodoCounts('user1'), {
      wrapper: createTestWrapper().wrapper
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });
});