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

// Note: Image commit functionality is now internal to the API layer

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

    // Note: Image commit functionality is now internal to the API layer

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

  it('should create resource with images (auto-commit handled internally)', async () => {
    // Arrange: Create test data with image URLs
    const tempImageUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/temp/user-123/photo1.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/temp/user-123/photo2.jpg',
    ];

    const fakeResourceInfo = createFakeResourceInfo({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
      imageUrls: tempImageUrls,
    });

    const resourceData = createFakeResourceData({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
      imageUrls: tempImageUrls,
    });

    // Mock the API to return the resource with committed images
    mockCreateResource.mockResolvedValue(fakeResourceInfo);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResourceInfo = await result.current.mutateAsync(resourceData);

    // Assert: Should return resource info (image commit happens internally in API)
    expect(createdResourceInfo).toEqual(fakeResourceInfo);
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });

  it('should handle resources without images', async () => {
    // Arrange: Create test data without images
    const fakeResourceInfo = createFakeResourceInfo({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
    });

    const resourceData = createFakeResourceData({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
      imageUrls: undefined, // Explicitly no images
    });

    mockCreateResource.mockResolvedValue(fakeResourceInfo);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResourceInfo = await result.current.mutateAsync(resourceData);

    // Assert: Should complete successfully
    expect(createdResourceInfo).toEqual(fakeResourceInfo);
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange: Create test data
    const resourceData = createFakeResourceData({
      ownerId: mockCurrentUser.id,
      communityId: fakeCommunity.id,
    });

    // Mock API to fail
    mockCreateResource.mockRejectedValue(new Error('API failed'));

    // Act & Assert: Should propagate API errors
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    
    await expect(result.current.mutateAsync(resourceData)).rejects.toThrow('API failed');
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });
});
