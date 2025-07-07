import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useUpdateCommunity } from '../../hooks/useUpdateCommunity';
import { createFakeCommunityInfo } from '../../__fakes__';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/updateCommunity', () => ({
  updateCommunity: vi.fn(),
}));

import { updateCommunity } from '../../api/updateCommunity';

describe('useUpdateCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockUpdateCommunity = vi.mocked(updateCommunity);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return CommunityInfo after update using mutateAsync', async () => {
    const communityId = faker.string.uuid();
    const updateData = {
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
    };
    const mockUpdatedInfo = createFakeCommunityInfo({
      id: communityId,
      name: updateData.name,
      description: updateData.description,
    });
    mockUpdateCommunity.mockResolvedValue(mockUpdatedInfo);

    const { result } = renderHook(() => useUpdateCommunity(), { wrapper });

    const updatedCommunity = await result.current.mutateAsync({ communityId, updateData });

    expect(updatedCommunity).toEqual(mockUpdatedInfo);
    expect(mockUpdateCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        id: communityId,
        name: updateData.name,
        description: updateData.description,
      }),
    );
  });
});
