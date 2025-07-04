import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventInfo } from '../types';
import { useEvents } from '../hooks/useEvents';

// Mock the shared module
vi.mock('../../../shared', () => ({
  useSupabase: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  queryKeys: {
    events: {
      all: ['events'],
      filtered: (filters: any) => ['events', 'filtered', filters],
    },
  },
}));

// Mock the event service
vi.mock('../services/event.service', () => ({
  createEventService: vi.fn(),
}));

// Mock the config
vi.mock('../../../config', () => ({
  STANDARD_CACHE_TIME: 5 * 60 * 1000, // 5 minutes
}));

import { useSupabase } from '../../../shared';
import { createEventService } from '../services/event.service';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateEventService = vi.mocked(createEventService);
const mockFetchEvents = vi.fn();

describe('useEvents', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockCreateEventService.mockReturnValue({
      fetchEvents: mockFetchEvents,
    } as any);

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should fetch events successfully', async () => {
    const mockEvents: EventInfo[] = [
      { id: '1', title: 'Test Event 1' } as EventInfo,
      { id: '2', title: 'Test Event 2' } as EventInfo,
    ];
    mockFetchEvents.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual(mockEvents);
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(undefined);
  });

  it('should apply filters when provided', async () => {
    const filters = { startDate: '2023-01-01', isActive: true };
    const mockEvents: EventInfo[] = [{ id: '1', title: 'Active Event' } as EventInfo];
    mockFetchEvents.mockResolvedValue(mockEvents);

    const { result } = renderHook(() => useEvents(filters), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual(mockEvents);
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(filters);
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Failed to fetch events');
    mockFetchEvents.mockRejectedValue(error);

    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});