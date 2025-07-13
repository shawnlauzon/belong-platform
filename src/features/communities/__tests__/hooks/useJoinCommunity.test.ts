import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useJoinCommunity } from '../../hooks/useJoinCommunity';
import { createFakeCommunityMembership } from '../../__fakes__';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/joinCommunity', () => ({
  joinCommunity: vi.fn(),
}));

import { joinCommunity } from '../../api/joinCommunity';

describe('useJoinCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockJoinCommunity = vi.mocked(joinCommunity);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return CommunityMembershipInfo after joining using mutateAsync', async () => {
    const communityId = faker.string.uuid();
    const mockMembershipInfo = createFakeCommunityMembership({
      communityId,
    });
    mockJoinCommunity.mockResolvedValue(mockMembershipInfo);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });

    const membershipInfo = await result.current.mutateAsync(communityId);

    expect(membershipInfo).toEqual(mockMembershipInfo);
    expect(mockJoinCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
    );
  });
});
