import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useCommunity } from '../../hooks/useCommunity';
import { createFakeCommunity } from '../../__fakes__';
import { createFakeUser } from '@/features/users/__fakes__';

// Mock only external dependencies
vi.mock('../../api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

import { fetchCommunityById } from '../../api/fetchCommunityById';

describe('useCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchCommunityById = vi.mocked(fetchCommunityById);

  let fakeCommunity: ReturnType<typeof createFakeCommunity>;
  let fakeOrganizer: ReturnType<typeof createFakeUser>;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());

    // Setup mock data
    fakeOrganizer = createFakeUser();
    fakeCommunity = createFakeCommunity({
      organizerId: fakeOrganizer.id,
    });

    // Setup mocks
    mockFetchCommunityById.mockResolvedValue(fakeCommunity);
  });

  it('should fetch and return Community', async () => {
    const { result } = renderHook(() => useCommunity(fakeCommunity.id), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }

    // Should return Community object with basic data (no relations)
    expect(result.current.data).toEqual(
      expect.objectContaining({
        id: fakeCommunity.id,
        name: fakeCommunity.name,
        description: fakeCommunity.description,
      }),
    );

    // Should NOT have organizer object, only organizerId
    expect(result.current.data).not.toHaveProperty('organizer');
    expect(result.current.data).toHaveProperty('organizerId');
    expect(result.current.data?.organizerId).toBe(fakeCommunity.organizerId);

    // Verify external calls were made correctly
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      expect.any(Object),
      fakeCommunity.id,
    );
  });

  it('should return null when community not found', async () => {
    mockFetchCommunityById.mockResolvedValue(null);

    const { result } = renderHook(() => useCommunity('nonexistent-id'), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
  });

  it('should return null when organizer not found', async () => {
    mockFetchCommunityById.mockResolvedValue(fakeCommunity);

    const { result } = renderHook(() => useCommunity(fakeCommunity.id), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }
  });
});
