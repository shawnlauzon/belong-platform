import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import { useCreateCommunity } from '../../hooks/useCreateCommunity';
import {
  createMockCommunityData,
  createMockCommunityInfo,
} from '../../__mocks__';
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

  it('should return CommunityInfo after creation', async () => {
    const communityData = createMockCommunityData();
    const mockCreatedInfo = createMockCommunityInfo({
      id: faker.string.uuid(),
      name: communityData.name,
      organizerId: communityData.organizerId,
    });
    mockCreateCommunity.mockResolvedValue(mockCreatedInfo);

    const { result } = renderHook(() => useCreateCommunity(), { wrapper });
    const createCommunityFn = result.current;

    const createdCommunity = await createCommunityFn(communityData);

    expect(createdCommunity).toEqual(mockCreatedInfo);
  });
});
