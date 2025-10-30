import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useJoinCommunity } from '../useJoinCommunity';
import { joinCommunity } from '../../api/joinCommunity';
import {
  createFakeCommunityMembership,
  createFakeCommunity,
} from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createTestWrapper } from '@/test-utils/testWrapper';
import {
  communityKeys,
  communityMembersKeys,
  userCommunitiesKeys,
} from '../../queries';
import { trustScoreKeys } from '@/features/trust-scores/queries';
import { feedKeys } from '@/features/feed/queries';
import type { Database } from '@/shared/types/database';
import * as authHooks from '@/features/auth';
import * as sharedHooks from '@/shared/hooks';

// Mock the API function
vi.mock('../../api/joinCommunity', () => ({
  joinCommunity: vi.fn(),
}));

// Mock the auth and shared hooks
vi.mock('@/features/auth', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/shared/hooks', () => ({
  useSupabase: vi.fn(),
}));

describe('useJoinCommunity', () => {
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

  describe('cache invalidation', () => {
    it('should invalidate community lists after joining (memberCount changed)', async () => {
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

      // Assert - Should invalidate community lists because memberCount changed
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: communityKeys.lists(),
        });
      });
    });

    it('should invalidate community members list after joining', async () => {
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

      // Assert - Should invalidate members list for this community
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: communityMembersKeys.list(community.id),
        });
      });
    });

    it('should invalidate user communities list after joining', async () => {
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

      // Assert - Should invalidate user's communities list
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: userCommunitiesKeys.list(mockUser.id),
        });
      });
    });

    it('should invalidate trust scores after joining (user gets +50 points)', async () => {
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

      // Assert - Should invalidate trust scores because user gets +50 points
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: trustScoreKeys.listByUser(mockUser.id),
        });
      });
    });

    it('should invalidate feed after joining (user sees new community content)', async () => {
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

      // Assert - Should invalidate feed because user now sees this community's content
      await waitFor(() => {
        expect(invalidateSpy).toHaveBeenCalledWith({
          queryKey: feedKeys.all,
        });
      });
    });
  });

  describe('error handling', () => {
    it('should throw error if user is not authenticated', async () => {
      // Arrange
      vi.mocked(authHooks.useCurrentUser).mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        isError: false,
        isSuccess: true,
        status: 'success',
      } as ReturnType<typeof authHooks.useCurrentUser>);

      const communityId = 'community-123';
      const { wrapper } = createTestWrapper();

      // Act & Assert
      const { result } = renderHook(() => useJoinCommunity(), { wrapper });
      await expect(result.current.mutateAsync(communityId)).rejects.toThrow(
        'User must be authenticated to join a community',
      );
    });

    it('should throw error if API call fails', async () => {
      // Arrange
      const apiError = new Error('API Error');
      vi.mocked(joinCommunity).mockRejectedValue(apiError);

      const communityId = 'community-123';
      const { wrapper } = createTestWrapper();

      // Act & Assert
      const { result } = renderHook(() => useJoinCommunity(), { wrapper });
      await expect(result.current.mutateAsync(communityId)).rejects.toThrow(
        'API Error',
      );
    });
  });

  describe('API integration', () => {
    it('should call joinCommunity API with correct parameters', async () => {
      // Arrange
      const community = createFakeCommunity();
      const membership = createFakeCommunityMembership({
        userId: mockUser.id,
        communityId: community.id,
      });

      vi.mocked(joinCommunity).mockResolvedValue(membership);

      const { wrapper } = createTestWrapper();

      // Act
      const { result } = renderHook(() => useJoinCommunity(), { wrapper });
      await result.current.mutateAsync(community.id);

      // Assert
      expect(joinCommunity).toHaveBeenCalledWith(
        expect.any(Object), // Supabase client
        mockUser.id,
        community.id,
      );
    });

    it('should return the created membership', async () => {
      // Arrange
      const community = createFakeCommunity();
      const membership = createFakeCommunityMembership({
        userId: mockUser.id,
        communityId: community.id,
        role: 'member',
      });

      vi.mocked(joinCommunity).mockResolvedValue(membership);

      const { wrapper } = createTestWrapper();

      // Act
      const { result } = renderHook(() => useJoinCommunity(), { wrapper });
      const returnedMembership = await result.current.mutateAsync(community.id);

      // Assert
      expect(returnedMembership).toEqual(membership);
    });
  });
});
