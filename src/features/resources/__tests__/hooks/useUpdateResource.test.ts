import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateResource } from '../../hooks/useUpdateResource';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  updateResource: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateResource } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockUpdateResource = vi.mocked(updateResource);

describe('useUpdateResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return ResourceInfo after update with new parameter structure', async () => {
    // Arrange: Create test data using factories
    const mockUpdatedResourceInfo = createFakeResource();
    const updateData = {
      id: mockUpdatedResourceInfo.id,
      title: 'Updated Title',
      description: 'Updated Description',
    };

    mockUpdateResource.mockResolvedValue(mockUpdatedResourceInfo);

    // Act
    const { result } = renderHook(() => useUpdateResource(), { wrapper });
    const updatedResourceInfo = await result.current.mutateAsync(updateData);

    // Assert: Should return ResourceInfo with ID references
    expect(updatedResourceInfo).toBeDefined();
    expect(updatedResourceInfo).toEqual(mockUpdatedResourceInfo);

    // Should have ID references and composed objects (Resource type)
    expect(updatedResourceInfo).toHaveProperty('ownerId');
    expect(updatedResourceInfo).toHaveProperty('communityId');

    // Should HAVE composed objects (Resource type includes relations)
    expect(updatedResourceInfo).toHaveProperty('owner');

    // Verify API was called with correct parameters (new single parameter structure)
    expect(mockUpdateResource).toHaveBeenCalledWith(mockSupabase, updateData);
  });
});
