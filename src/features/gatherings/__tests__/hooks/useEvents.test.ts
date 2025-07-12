import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createTestWrapper } from '../../../../test-utils';
import { createFakeGathering } from '../../__fakes__';
import { useGatherings } from '../../hooks/useGatherings';

// Mock the API function
vi.mock('../../api/fetchGatherings', () => ({
  fetchGatherings: vi.fn(),
}));

import { fetchGatherings } from '../../api/fetchGatherings';
const mockFetchGatherings = vi.mocked(fetchGatherings);

describe('useGatherings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch gatherings successfully', async () => {
    const fakeGatherings = [
      createFakeGathering(),
      createFakeGathering(),
    ];

    mockFetchGatherings.mockResolvedValue(fakeGatherings);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatherings(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeGatherings);
    expect(mockFetchGatherings).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('should fetch gatherings with filters', async () => {
    const fakeGatherings = [createFakeGathering()];
    const filters = {
      communityId: 'test-community',
      startAfter: new Date('2024-01-01'),
    };

    mockFetchGatherings.mockResolvedValue(fakeGatherings);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatherings(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(fakeGatherings);
    expect(mockFetchGatherings).toHaveBeenCalledWith(expect.any(Object), filters);
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Failed to fetch gatherings');
    mockFetchGatherings.mockRejectedValue(error);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatherings(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('should use correct query key without filters', async () => {
    mockFetchGatherings.mockResolvedValue([]);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatherings(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Query key should be gatherings.all when no filters
    expect(mockFetchGatherings).toHaveBeenCalledWith(expect.any(Object), undefined);
  });

  it('should use correct query key with filters', async () => {
    const filters = { communityId: 'test' };
    mockFetchGatherings.mockResolvedValue([]);

    const { wrapper } = createTestWrapper();
    const { result } = renderHook(() => useGatherings(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchGatherings).toHaveBeenCalledWith(expect.any(Object), filters);
  });
});