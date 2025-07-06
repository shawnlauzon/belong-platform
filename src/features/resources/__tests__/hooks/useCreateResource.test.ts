import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateResource } from '../../hooks/useCreateResource';
import { createMockSupabase } from '../../../../test-utils';
import {
  createFakeResourceData,
  createFakeResourceInfo,
} from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Global mocks for shared and config modules are now handled in vitest.setup.ts
// This eliminates redundant mock definitions across test files

// Mock the API functions
vi.mock('../../api', () => ({
  createResource: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createResource } from '../../api';
import { useCurrentUser } from '../../../auth';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import { Community } from '@/features/communities';
import { createFakeCommunity } from '@/features/communities/__fakes__';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResource = vi.mocked(createResource);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useCreateResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockCurrentUser: User;
  let fakeCommunity: Community;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockCurrentUser = createFakeUser();
    fakeCommunity = createFakeCommunity();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);
    mockUseCurrentUser.mockReturnValue({
      data: mockCurrentUser,
    } as ReturnType<typeof useCurrentUser>);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return ResourceInfo after creation', async () => {
    // Arrange: Create test data using factories
    const fakeResourceInfo = createFakeResourceInfo({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
    });

    const resourceData = createFakeResourceData({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
    });

    mockCreateResource.mockResolvedValue(fakeResourceInfo);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResourceInfo = await result.current.mutateAsync(resourceData);

    // Assert: Should return ResourceInfo with ID references
    expect(createdResourceInfo).toBeDefined();
    expect(createdResourceInfo).toEqual(
      expect.objectContaining({
        id: fakeResourceInfo.id,
        title: fakeResourceInfo.title,
        ownerId: mockCurrentUser.id,
        communityId: resourceData.communityId,
      }),
    );

    // Should have ID references (ResourceInfo pattern)
    expect(createdResourceInfo).toHaveProperty('ownerId');
    expect(createdResourceInfo).toHaveProperty('communityId');

    // Should NOT have composed objects (these are only in Resource type)
    expect(createdResourceInfo).not.toHaveProperty('owner');
    expect(createdResourceInfo).not.toHaveProperty('community');

    // Verify API was called with correct parameters
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });
});
