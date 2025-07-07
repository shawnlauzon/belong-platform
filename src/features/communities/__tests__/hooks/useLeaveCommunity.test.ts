import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import { useLeaveCommunity } from '../../hooks/useLeaveCommunity';
import { faker } from '@faker-js/faker';

// Mock only the API function
vi.mock('../../api/leaveCommunity', () => ({
  leaveCommunity: vi.fn(),
}));

import { leaveCommunity } from '../../api/leaveCommunity';

describe('useLeaveCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  const mockLeaveCommunity = vi.mocked(leaveCommunity);

  beforeEach(() => {
    vi.clearAllMocks();
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should leave community successfully using mutateAsync', async () => {
    const communityId = faker.string.uuid();
    mockLeaveCommunity.mockResolvedValue();

    const { result } = renderHook(() => useLeaveCommunity(), { wrapper });

    await result.current.mutateAsync(communityId);

    expect(mockLeaveCommunity).toHaveBeenCalledWith(
      expect.any(Object),
      communityId,
    );
  });
});
