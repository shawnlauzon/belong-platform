import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useCommunityMembers } from '../../hooks/useCommunityMembers';
import { createFakeCommunityMembershipInfo } from '../../__fakes__';
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
      createFakeCommunityMembershipInfo({ communityId }),
      createFakeCommunityMembershipInfo({ communityId }),
      createFakeCommunityMembershipInfo({ communityId }),
    ];
    mockFetchCommunityMembers.mockResolvedValue(mockMembers);

    const { result } = renderHook(() => useCommunityMembers(communityId), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(3);
    });

    expect(result.current.data).toEqual(mockMembers);
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
      expect(result.current.data).toEqual([]);
    });
  });
});
