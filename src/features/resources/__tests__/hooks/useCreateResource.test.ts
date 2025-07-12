import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateResource } from '../../hooks/useCreateResource';
import { createMockSupabase } from '../../../../test-utils';
import {
  createFakeResourceInput,
  createFakeResourceWithOwner,
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
import { createFakeCommunity } from '@/features/communities/__fakes__';
import type { Community } from '@/features/communities';

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

  it('should return Resource after creation', async () => {
    // Arrange: Create test data using factories
    const fakeResource = createFakeResourceWithOwner(mockCurrentUser, {
      communityId: fakeCommunity.id,
    });

    const resourceData = createFakeResourceInput({
      communityId: fakeCommunity.id,
    });

    mockCreateResource.mockResolvedValue(fakeResource);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResource = await result.current.mutateAsync(resourceData);

    // Assert: Should return Resource with ID references
    expect(createdResource).toBeDefined();
    expect(createdResource).toEqual(
      expect.objectContaining({
        id: fakeResource.id,
        title: fakeResource.title,
        ownerId: mockCurrentUser.id,
        communityId: resourceData.communityId,
      }),
    );

    // Should have objects as returned by the fake
    expect(createdResource.owner).toEqual(
      expect.objectContaining({
        id: mockCurrentUser.id,
        firstName: mockCurrentUser.firstName,
        avatarUrl: mockCurrentUser.avatarUrl,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });

  it('should create resource with images (auto-commit handled internally)', async () => {
    // Arrange: Create test data with image URLs
    const tempImageUrls = [
      'https://example.supabase.co/storage/v1/object/public/images/temp/user-123/photo1.jpg',
      'https://example.supabase.co/storage/v1/object/public/images/temp/user-123/photo2.jpg',
    ];

    const fakeResource = createFakeResourceWithOwner(mockCurrentUser, {
      communityId: fakeCommunity.id,
      imageUrls: tempImageUrls,
    });

    const resourceData = createFakeResourceInput({
      communityId: fakeCommunity.id,
      imageUrls: tempImageUrls,
    });

    // Mock the API to return the resource with committed images
    mockCreateResource.mockResolvedValue(fakeResource);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResource = await result.current.mutateAsync(resourceData);

    // Assert: Should return resource info (image commit happens internally in API)
    expect(createdResource).toEqual(fakeResource);
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });

  it('should handle resources without images', async () => {
    // Arrange: Create test data without images
    const fakeResource = createFakeResourceWithOwner(mockCurrentUser, {
      communityId: fakeCommunity.id,
      imageUrls: undefined, // Explicitly no images
    });

    const resourceData = createFakeResourceInput({
      communityId: fakeCommunity.id,
      imageUrls: undefined, // Explicitly no images
    });

    mockCreateResource.mockResolvedValue(fakeResource);

    // Act
    const { result } = renderHook(() => useCreateResource(), { wrapper });
    const createdResource = await result.current.mutateAsync(resourceData);

    // Assert: Should complete successfully
    expect(createdResource).toEqual(fakeResource);
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange: Create test data
    const resourceData = createFakeResourceInput({
      communityId: fakeCommunity.id,
    });

    // Mock API to fail
    mockCreateResource.mockRejectedValue(new Error('API failed'));

    // Act & Assert: Should propagate API errors
    const { result } = renderHook(() => useCreateResource(), { wrapper });

    await expect(result.current.mutateAsync(resourceData)).rejects.toThrow(
      'API failed',
    );
    expect(mockCreateResource).toHaveBeenCalledWith(mockSupabase, resourceData);
  });
});
