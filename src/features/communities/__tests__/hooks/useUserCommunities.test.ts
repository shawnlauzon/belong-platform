import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import { useUserCommunities } from '../../hooks/useUserCommunities';
import { createMockCommunityMembership } from '../../__mocks__';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/fetchUserCommunities', () => ({
  fetchUserCommunities: vi.fn(),
}));

import { fetchUserCommunities } from '../../api/fetchUserCommunities';

describe('useUserCommunities', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchUserCommunities = vi.mocked(fetchUserCommunities);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return query result with CommunityMembership data when user has communities', async () => {
    const userId = faker.string.uuid();
    const mockMemberships = [
      createMockCommunityMembership({ userId, role: 'organizer' }),
      createMockCommunityMembership({ userId, role: 'admin' }),
      createMockCommunityMembership({ userId, role: 'member' }),
    ];
    mockFetchUserCommunities.mockResolvedValue(mockMemberships);

    const { result } = renderHook(() => useUserCommunities(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    expect(result.current.data).toEqual(mockMemberships);
    expect(mockFetchUserCommunities).toHaveBeenCalledWith(
      expect.any(Object),
      userId,
    );
  });

  it('should return query result with empty array when user has no communities', async () => {
    const userId = faker.string.uuid();
    mockFetchUserCommunities.mockResolvedValue([]);

    const { result } = renderHook(() => useUserCommunities(userId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
    });
  });

  it('should not fetch when userId is undefined', async () => {
    const { result } = renderHook(() => useUserCommunities(undefined), {
      wrapper,
    });

    // Query should be disabled and not fetch
    expect(result.current.status).toBe('pending');
    expect(mockFetchUserCommunities).not.toHaveBeenCalled();
  });
});