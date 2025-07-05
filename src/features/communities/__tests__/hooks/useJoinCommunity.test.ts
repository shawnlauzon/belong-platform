import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import { useJoinCommunity } from '../../hooks/useJoinCommunity';
import { createMockCommunityMembershipInfo } from '../../__mocks__';
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

  it('should return CommunityMembershipInfo after joining', async () => {
    const communityId = faker.string.uuid();
    const mockMembershipInfo = createMockCommunityMembershipInfo({
      communityId,
      role: 'member',
    });
    mockJoinCommunity.mockResolvedValue(mockMembershipInfo);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });
    const joinCommunityFn = result.current;

    const membershipInfo = await joinCommunityFn(communityId);

    expect(membershipInfo).toEqual(mockMembershipInfo);
    expect(mockJoinCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
      'member',
    );
  });

  it('should support joining with admin role', async () => {
    const communityId = faker.string.uuid();
    const mockMembershipInfo = createMockCommunityMembershipInfo({
      communityId,
      role: 'admin',
    });
    mockJoinCommunity.mockResolvedValue(mockMembershipInfo);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });
    const joinCommunityFn = result.current;

    const membershipInfo = await joinCommunityFn(communityId, 'admin');

    expect(membershipInfo).toEqual(mockMembershipInfo);
    expect(mockJoinCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
      'admin',
    );
  });
});