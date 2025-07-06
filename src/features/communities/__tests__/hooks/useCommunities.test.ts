import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useCommunities } from '../../hooks/useCommunities';
import { createFakeCommunityInfo } from '../../__fakes__';

// Mock only the API function, not the shared utilities
vi.mock('../../api/fetchCommunities', () => ({
  fetchCommunities: vi.fn(),
}));

import { fetchCommunities } from '../../api/fetchCommunities';

describe('useCommunities', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchCommunities = vi.mocked(fetchCommunities);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return array of CommunityInfo when communities exist', async () => {
    const mockCommunities = [
      createFakeCommunityInfo({ id: '1', name: 'Test Community 1' }),
      createFakeCommunityInfo({ id: '2', name: 'Test Community 2' }),
    ];
    mockFetchCommunities.mockResolvedValue(mockCommunities);

    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(2);
    });

    expect(result.current.data).toEqual(mockCommunities);
  });

  it('should apply filters when provided', async () => {
    const filters = { name: 'Test', organizerId: 'user-123' };
    const mockCommunities = [
      createFakeCommunityInfo({ name: 'Test Community' }),
    ];
    mockFetchCommunities.mockResolvedValue(mockCommunities);

    const { result } = renderHook(() => useCommunities(filters), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1);
    });

    expect(mockFetchCommunities).toHaveBeenCalledWith(
      expect.any(Object),
      filters,
    );
  });

  it('should return empty array when no communities found', async () => {
    mockFetchCommunities.mockResolvedValue([]);

    const { result } = renderHook(() => useCommunities(), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });
});
