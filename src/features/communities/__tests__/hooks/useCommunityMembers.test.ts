import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import { useCommunityMembers } from '../../hooks/useCommunityMembers';
import { createMockCommunityMembership } from '../../__mocks__';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/fetchCommunityMembers', () => ({
  fetchCommunityMembers: vi.fn(),
}));

import { fetchCommunityMembers } from '../../api/fetchCommunityMembers';

describe('useCommunityMembers', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockFetchCommunityMembers = vi.mocked(fetchCommunityMembers);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return array of CommunityMembership when members exist', async () => {
    const communityId = faker.string.uuid();
    const mockMembers = [
      createMockCommunityMembership({ communityId, role: 'organizer' }),
      createMockCommunityMembership({ communityId, role: 'admin' }),
      createMockCommunityMembership({ communityId, role: 'member' }),
    ];
    mockFetchCommunityMembers.mockResolvedValue(mockMembers);

    const { result } = renderHook(() => useCommunityMembers(communityId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toHaveLength(3);
    });

    expect(result.current).toEqual(mockMembers);
    expect(mockFetchCommunityMembers).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
    );
  });

  it('should return empty array when no members found', async () => {
    const communityId = faker.string.uuid();
    mockFetchCommunityMembers.mockResolvedValue([]);

    const { result } = renderHook(() => useCommunityMembers(communityId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual([]);
    });
  });
});