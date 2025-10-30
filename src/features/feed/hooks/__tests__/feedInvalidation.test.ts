import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestWrapper } from '@/test-utils/testWrapper';
import { feedKeys } from '../../queries';
import type { Database } from '@/shared/types/database';
import * as authHooks from '@/features/auth';
import * as sharedHooks from '@/shared/hooks';

// Resources
import { useCreateResource } from '@/features/resources/hooks/useCreateResource';
import { useDeleteResource } from '@/features/resources/hooks/useDeleteResource';
import { useUpdateResource } from '@/features/resources/hooks/useUpdateResource';
import { useRenewResource } from '@/features/resources/hooks/useRenewResource';
import { createResource } from '@/features/resources/api/createResource';
import { deleteResource } from '@/features/resources/api/deleteResource';
import { updateResource } from '@/features/resources/api/updateResource';
import { renewResource } from '@/features/resources/api/renewResource';
import {
  createFakeResource,
  createFakeResourceInput,
} from '@/features/resources/__fakes__';

// Communities
import { useJoinCommunity } from '@/features/communities/hooks/useJoinCommunity';
import { useLeaveCommunity } from '@/features/communities/hooks/useLeaveCommunity';
import { joinCommunity } from '@/features/communities/api/joinCommunity';
import { leaveCommunity } from '@/features/communities/api/leaveCommunity';
import {
  createFakeCommunity,
  createFakeCommunityMembership,
} from '@/features/communities/__fakes__';

// Shoutouts
import { useCreateShoutout } from '@/features/shoutouts/hooks/useCreateShoutout';
import { useDeleteShoutout } from '@/features/shoutouts/hooks/useDeleteShoutout';
import { createShoutout } from '@/features/shoutouts/api/createShoutout';
import { deleteShoutout } from '@/features/shoutouts/api/deleteShoutout';
import { createFakeShoutout } from '@/features/shoutouts/__fakes__';

// Shared
import { createFakeUser } from '@/features/users/__fakes__';

// Mock all API functions
vi.mock('@/features/resources/api/createResource');
vi.mock('@/features/resources/api/deleteResource');
vi.mock('@/features/resources/api/updateResource');
vi.mock('@/features/resources/api/renewResource');
vi.mock('@/features/communities/api/joinCommunity');
vi.mock('@/features/communities/api/leaveCommunity');
vi.mock('@/features/shoutouts/api/createShoutout');
vi.mock('@/features/shoutouts/api/deleteShoutout');

// Mock auth and shared hooks
vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useSupabase: vi.fn(),
}));

/**
 * Comprehensive test suite for feed cache invalidation across all features.
 *
 * The feed aggregates content from multiple sources (resources, shoutouts, events).
 * When content is created, updated, or deleted, the feed cache must be invalidated
 * to ensure users see the latest content.
 *
 * EXPECTED BEHAVIOR:
 * - Creating/deleting/updating resources → invalidate feed ✅
 * - Joining/leaving communities → invalidate feed ✅
 * - Creating shoutouts → invalidate feed ❌ (CURRENTLY MISSING - test will fail)
 * - Deleting shoutouts → invalidate feed ❌ (CURRENTLY MISSING - test will fail)
 */
describe('Feed Cache Invalidation', () => {
  const mockUser = createFakeUser();
  const mockSupabaseClient = {} as SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: mockUser,
      isLoading: false,
      error: null,
      isError: false,
      isSuccess: true,
      status: 'success',
    } as ReturnType<typeof authHooks.useCurrentUser>);

    vi.mocked(sharedHooks.useSupabase).mockReturnValue(mockSupabaseClient);
  });

  describe('Resource operations', () => {
    it('should invalidate feed when creating a resource', async () => {
      // Arrange
      const resourceInput = createFakeResourceInput({
        type: 'offer',
        title: 'Free couch',
      });
      const createdResource = createFakeResource({
        ...resourceInput,
        id: 'resource-123',
      });

      vi.mocked(createResource).mockResolvedValue(createdResource);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useCreateResource(), { wrapper });
      await result.current.mutateAsync(resourceInput);

      // Assert - Feed should be invalidated when new resource is created
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });

    it('should invalidate feed when deleting a resource', async () => {
      // Arrange
      const resource = createFakeResource({ id: 'resource-123' });

      vi.mocked(deleteResource).mockResolvedValue(resource);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useDeleteResource(), { wrapper });
      await result.current.mutateAsync(resource.id);

      // Assert - Feed should be invalidated when resource is deleted
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });

    it('should invalidate feed when updating a resource', async () => {
      // Arrange
      const resource = createFakeResource({ id: 'resource-123' });
      const updates = { title: 'Updated title' };

      vi.mocked(updateResource).mockResolvedValue({
        ...resource,
        ...updates,
      });

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useUpdateResource(), { wrapper });
      await result.current.mutateAsync({ id: resource.id, ...updates });

      // Assert - Feed should be invalidated when resource is updated
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });

    it('should invalidate feed when renewing a resource', async () => {
      // Arrange
      const resource = createFakeResource({
        id: 'resource-123',
        expiresAt: new Date(),
      });
      const renewedResource = {
        ...resource,
        lastRenewedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days later
      };

      vi.mocked(renewResource).mockResolvedValue(renewedResource);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useRenewResource(), { wrapper });
      await result.current.mutateAsync(resource.id);

      // Assert - Feed SHOULD be invalidated when resource is renewed
      // ❌ THIS TEST WILL FAIL - resource renewal doesn't invalidate feed
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });
  });

  describe('Community membership operations', () => {
    it('should invalidate feed when joining a community', async () => {
      // Arrange
      const community = createFakeCommunity();
      const membership = createFakeCommunityMembership({
        userId: mockUser.id,
        communityId: community.id,
      });

      vi.mocked(joinCommunity).mockResolvedValue(membership);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useJoinCommunity(), { wrapper });
      await result.current.mutateAsync(community.id);

      // Assert - Feed should be invalidated when joining community (new content visible)
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });

    it('should invalidate feed when leaving a community', async () => {
      // Arrange
      const community = createFakeCommunity();

      vi.mocked(leaveCommunity).mockResolvedValue();

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useLeaveCommunity(), { wrapper });
      await result.current.mutateAsync(community.id);

      // Assert - Feed should be invalidated when leaving community (content hidden)
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });
  });

  describe('Shoutout operations', () => {
    it('should invalidate feed when creating a shoutout', async () => {
      // Arrange
      const shoutout = createFakeShoutout({
        senderId: mockUser.id,
        message: 'Thanks for the help!',
      });

      vi.mocked(createShoutout).mockResolvedValue(shoutout);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useCreateShoutout(), { wrapper });
      await result.current.mutateAsync({
        message: shoutout.message,
        resourceId: shoutout.resourceId,
      });

      // Assert - Feed SHOULD be invalidated when shoutout is created
      // ❌ THIS TEST WILL FAIL - shoutouts don't currently invalidate feed
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });

    it('should invalidate feed when deleting a shoutout', async () => {
      // Arrange
      const shoutout = createFakeShoutout({
        id: 'shoutout-123',
        senderId: mockUser.id,
      });

      vi.mocked(deleteShoutout).mockResolvedValue(shoutout);

      const { wrapper, queryClient } = createTestWrapper();
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      // Act
      const { result } = renderHook(() => useDeleteShoutout(), { wrapper });
      await result.current.mutateAsync(shoutout.id);

      // Assert - Feed SHOULD be invalidated when shoutout is deleted
      // ❌ THIS TEST WILL FAIL - shoutout deletion doesn't invalidate feed
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });
  });
});
