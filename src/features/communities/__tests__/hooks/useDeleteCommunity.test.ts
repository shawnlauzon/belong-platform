import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useDeleteCommunity } from '../../hooks/useDeleteCommunity';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/deleteCommunity', () => ({
  deleteCommunity: vi.fn(),
}));

import { deleteCommunity } from '../../api/deleteCommunity';

describe('useDeleteCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockDeleteCommunity = vi.mocked(deleteCommunity);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should delete community successfully', async () => {
    const communityId = faker.string.uuid();
    mockDeleteCommunity.mockResolvedValue();

    const { result } = renderHook(() => useDeleteCommunity(), { wrapper });
    const deleteCommunityFn = result.current;

    await deleteCommunityFn(communityId);

    expect(mockDeleteCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
    );
  });
});
