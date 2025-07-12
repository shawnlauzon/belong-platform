import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateGathering } from '../../hooks/useUpdateGathering';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeGathering } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import { faker } from '@faker-js/faker';

// Mock the API
vi.mock('../../api', () => ({
  updateGathering: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateGathering } from '../../api';
import { GatheringInput } from '../../types';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateGathering = vi.mocked(updateGathering);

describe('useUpdateGathering', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return Gathering after update with new parameter structure', async () => {
    // Arrange: Create test data using factories
    const mockUpdatedGathering = createFakeGathering();
    const updateData: Partial<GatheringInput> & { id: string } = {
      id: mockUpdatedGathering.id,
      title: faker.lorem.words(3),
      description: faker.lorem.paragraph(),
    };

    mockUpdateGathering.mockResolvedValue(mockUpdatedGathering);

    // Act
    const { result } = renderHook(() => useUpdateGathering(), { wrapper });
    const updatedGathering = await result.current.mutateAsync(updateData);

    // Assert: Should return Gathering with ID references
    expect(updatedGathering).toBeDefined();
    expect(updatedGathering).toEqual(mockUpdatedGathering);

    // Should have ID references
    expect(updatedGathering).toHaveProperty('organizerId');
    expect(updatedGathering).toHaveProperty('communityId');

    // Should have placeholder objects for organizer and community
    expect(updatedGathering).toHaveProperty('organizer');
    expect(updatedGathering).toHaveProperty('community');
    expect(updatedGathering.organizer.id).toBe(updatedGathering.organizerId);
    expect(updatedGathering.community.id).toBe(updatedGathering.communityId);

    // Verify API was called with correct parameters (new single parameter structure)
    expect(mockUpdateGathering).toHaveBeenCalledWith(mockSupabase, updateData);
  });
});
