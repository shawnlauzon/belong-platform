import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useUpdateCommunity } from '../../hooks/useUpdateCommunity';
import { createFakeCommunity } from '../../__fakes__';
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

  it('should return CommunityInfo after update using mutateAsync with new parameter structure', async () => {
    const communityId = faker.string.uuid();
    const updateData = {
      id: communityId,
      name: faker.company.name(),
      description: faker.lorem.paragraph(),
    };
    const mockUpdatedInfo = createFakeCommunity({
      id: communityId,
      name: updateData.name,
      description: updateData.description,
    });
    mockUpdateCommunity.mockResolvedValue(mockUpdatedInfo);

    const { result } = renderHook(() => useUpdateCommunity(), { wrapper });

    const updatedCommunity = await result.current.mutateAsync(updateData);

    expect(updatedCommunity).toEqual(mockUpdatedInfo);
    expect(mockUpdateCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      updateData,
    );
  });
});
