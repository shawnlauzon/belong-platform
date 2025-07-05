import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useUpdateResource } from '../../hooks/useUpdateResource';
import { createMockSupabase } from '../../../../test-utils';
import { createMockResourceInfo } from '../../__mocks__';
import { createDefaultTestWrapper } from '../../../../shared/__tests__/testWrapper';

// Mock the API
vi.mock('../../api', () => ({
  updateResource: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { updateResource } from '../../api';
import { ResourceData } from '../../types';

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

  it('should return ResourceInfo after update', async () => {
    // Arrange: Create test data using factories
    const mockUpdatedResourceInfo = createMockResourceInfo();
    const updateData: Partial<ResourceData> = {
      title: 'Updated Title',
      description: 'Updated Description',
    };

    mockUpdateResource.mockResolvedValue(mockUpdatedResourceInfo);

    // Act
    const { result } = renderHook(() => useUpdateResource(), { wrapper });
    const updatedResourceInfo = await result.current.mutateAsync({ 
      id: mockUpdatedResourceInfo.id, 
      data: updateData 
    });

    // Assert: Should return ResourceInfo with ID references
    expect(updatedResourceInfo).toBeDefined();
    expect(updatedResourceInfo).toEqual(mockUpdatedResourceInfo);

    // Should have ID references (ResourceInfo pattern)
    expect(updatedResourceInfo).toHaveProperty('ownerId');
    expect(updatedResourceInfo).toHaveProperty('communityId');

    // Should NOT have composed objects (these are only in Resource type)
    expect(updatedResourceInfo).not.toHaveProperty('owner');
    expect(updatedResourceInfo).not.toHaveProperty('community');

    // Verify API was called with correct parameters
    expect(mockUpdateResource).toHaveBeenCalledWith(mockSupabase, mockUpdatedResourceInfo.id, updateData);
  });
});