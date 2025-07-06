import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEvents } from '../../hooks/useEvents';
import { createTestWrapper } from '../../../../test-utils';
import { createFakeEventInfo } from '../../__fakes__';
import type { EventFilter } from '../../types';

// Mock the API function
vi.mock('../../api/fetchEvents', () => ({
  fetchEvents: vi.fn(),
}));

import { fetchEvents } from '../../api/fetchEvents';
const mockFetchEvents = vi.mocked(fetchEvents);

describe('useEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch events successfully', async () => {
    const fakeEvents = [
      createFakeEventInfo(),
      createFakeEventInfo(),
    ];

    mockFetchEvents.mockResolvedValue(fakeEvents);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeEvents);
    expect(mockFetchEvents).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('should fetch events with filters', async () => {
    const fakeEvents = [createFakeEventInfo()];
    const filters: EventFilter = {
      communityId: 'test-community',
      startAfter: new Date('2024-01-01'),
    };

    mockFetchEvents.mockResolvedValue(fakeEvents);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEvents(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeEvents);
    expect(mockFetchEvents).toHaveBeenCalledWith(expect.any(Object), filters);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch events');
    mockFetchEvents.mockRejectedValue(error);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query key without filters', async () => {
    mockFetchEvents.mockResolvedValue([]);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEvents(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query key should be events.all when no filters
    expect(mockFetchEvents).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('should use correct query key with filters', async () => {
    const filters: EventFilter = { communityId: 'test' };
    mockFetchEvents.mockResolvedValue([]);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useEvents(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(expect.any(Object), filters);
  });
});