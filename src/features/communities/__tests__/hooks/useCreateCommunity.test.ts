import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useCreateCommunity } from '../../hooks/useCreateCommunity';
import {
  createFakeCommunityData,
  createFakeCommunityInfo,
} from '../../__fakes__';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/createCommunity', () => ({
  createCommunity: vi.fn(),
}));

import { createCommunity } from '../../api/createCommunity';

describe('useCreateCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockCreateCommunity = vi.mocked(createCommunity);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return CommunityInfo after creation using mutateAsync', async () => {
    const communityData = createFakeCommunityData();
    const mockCreatedInfo = createFakeCommunityInfo({
      id: faker.string.uuid(),
      name: communityData.name,
    });
    mockCreateCommunity.mockResolvedValue(mockCreatedInfo);

    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    const createdCommunity = await result.current.mutateAsync(communityData);

    expect(createdCommunity).toEqual(mockCreatedInfo);
  });
});
