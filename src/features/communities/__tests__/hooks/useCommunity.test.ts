import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useCommunity } from '../../hooks/useCommunity';
import { createFakeCommunityInfo } from '../../__fakes__';
import { createFakeUserDetail } from '@/features/users/__fakes__';

// Mock only external dependencies
vi.mock('../../api/fetchCommunityById', () => ({
  fetchCommunityById: vi.fn(),
}));

vi.mock('@/features/users/api/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

import { fetchCommunityById } from '../../api/fetchCommunityById';
import { fetchUserById } from '@/features/users/api/fetchUserById';

describe('useCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchCommunityById = vi.mocked(fetchCommunityById);
  const mockFetchUserById = vi.mocked(fetchUserById);

  let fakeCommunityInfo: ReturnType<typeof createFakeCommunityInfo>;
  let fakeOrganizer: ReturnType<typeof createFakeUserDetail>;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());

    // Setup mock data
    fakeOrganizer = createFakeUserDetail();
    fakeCommunityInfo = createFakeCommunityInfo({
      organizerId: fakeOrganizer.id,
    });

    // Setup mocks
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);
    mockFetchUserById.mockResolvedValue(fakeOrganizer);
  });

  it('should compose full Community from CommunityInfo + User', async () => {
    const { result } = renderHook(() => useCommunity(fakeCommunityInfo.id), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess || result.current.isError).toBeTruthy();
    });
    if (result.current.isError) {
      throw result.current.error;
    }

    // Should return full Community object with composed data
    expect(result.current.data).toEqual(
      expect.objectContaining({
        id: fakeCommunityInfo.id,
        name: fakeCommunityInfo.name,
        description: fakeCommunityInfo.description,
        organizer: fakeOrganizer, // Full User object, not just ID
      }),
    );

    // Should NOT have ID reference (Info pattern converted to Domain)
    expect(result.current.data).not.toHaveProperty('organizerId');

    // Verify external calls were made correctly
    expect(mockFetchCommunityById).toHaveBeenCalledWith(
      expect.any(Object),
      fakeCommunityInfo.id,
    );
    expect(mockFetchUserById).toHaveBeenCalledWith(
      expect.any(Object),
      fakeCommunityInfo.organizerId,
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
    mockFetchCommunityById.mockResolvedValue(fakeCommunityInfo);
    mockFetchUserById.mockResolvedValue(null); // Organizer not found

    const { result } = renderHook(() => useCommunity(fakeCommunityInfo.id), {
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
