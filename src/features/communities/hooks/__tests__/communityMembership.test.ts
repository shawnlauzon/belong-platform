import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useJoinCommunity } from '../useJoinCommunity';
import { useLeaveCommunity } from '../useLeaveCommunity';
import { joinCommunity, leaveCommunity } from '../../api';
import { createFakeCommunityMembership } from '../../__fakes__';
import { createDefaultTestWrapper, createMockSupabase } from '@/test-utils';
import type { QueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { useSupabase, useCurrentUser } from '@/shared';
import { trustScoreKeys } from '../../../trust-scores/queries';
import { communityMembersKeys, userCommunitiesKeys } from '../../queries';

// Mock dependencies
vi.mock('../../api', () => ({
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
}));

vi.mock('@/shared', async () => {
  const actual = await vi.importActual('@/shared');
  return {
    ...actual,
    useSupabase: vi.fn(),
    useCurrentUser: vi.fn(),
  };
});

const mockUseSupabase = vi.mocked(useSupabase);
const mockUseCurrentUser = vi.mocked(useCurrentUser);
const mockJoinCommunity = vi.mocked(joinCommunity);
const mockLeaveCommunity = vi.mocked(leaveCommunity);

describe('Community membership hooks', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);
    
    // Mock current user
    mockUseCurrentUser.mockReturnValue({
      data: { id: 'test-user-id' },
      isLoading: false,
      error: null,
    } as any);

    // Use shared test wrapper
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;

    // Spy on queryClient methods to verify cache invalidation
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('should invalidate userCommunities cache when joining a community', async () => {
    const newMembership = createFakeCommunityMembership();
    mockJoinCommunity.mockResolvedValue(newMembership);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });

    await result.current.mutateAsync(newMembership.communityId);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Check that communityMembers cache is invalidated
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: communityMembersKeys.list(newMembership.communityId),
    });

    // Check that trust score cache is invalidated
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: trustScoreKeys.listByUser(newMembership.userId),
    });

    // Check that userCommunities cache is NOT invalidated (this is the issue!)
    const userCommunitiesInvalidated = (queryClient.invalidateQueries as any).mock.calls.some(
      (call: any) => {
        const queryKey = call[0]?.queryKey;
        return (
          Array.isArray(queryKey) &&
          queryKey[0] === 'userCommunities' &&
          queryKey[1] === 'list' &&
          queryKey[2] === newMembership.userId
        );
      }
    );

    // Verify that userCommunities cache IS invalidated for the joined user
    expect(userCommunitiesInvalidated).toBe(true);
  });

  it('should call joinCommunity API with correct parameters', async () => {
    const newMembership = createFakeCommunityMembership();
    mockJoinCommunity.mockResolvedValue(newMembership);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });

    await result.current.mutateAsync(newMembership.communityId);

    expect(joinCommunity).toHaveBeenCalledWith(
      mockSupabase,
      newMembership.communityId
    );
  });

  it('should handle join community errors', async () => {
    const error = new Error('Failed to join community');
    mockJoinCommunity.mockRejectedValue(error);

    const { result } = renderHook(() => useJoinCommunity(), { wrapper });

    await expect(
      result.current.mutateAsync('community-id')
    ).rejects.toThrow('Failed to join community');
  });

  describe('useLeaveCommunity', () => {
    it('should invalidate userCommunities cache when leaving a community', async () => {
      const membership = createFakeCommunityMembership();
      mockLeaveCommunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaveCommunity(), { wrapper });

      await result.current.mutateAsync(membership.communityId);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Check that communityMembers cache is invalidated
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: communityMembersKeys.list(membership.communityId),
      });

      // Check that userCommunities cache IS invalidated for the current user
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: userCommunitiesKeys.list('test-user-id'),
      });
    });

    it('should call leaveCommunity API with correct parameters', async () => {
      const communityId = 'test-community-id';
      mockLeaveCommunity.mockResolvedValue(undefined);

      const { result } = renderHook(() => useLeaveCommunity(), { wrapper });

      await result.current.mutateAsync(communityId);

      expect(leaveCommunity).toHaveBeenCalledWith(
        mockSupabase,
        communityId
      );
    });

    it('should handle leave community errors', async () => {
      const error = new Error('Failed to leave community');
      mockLeaveCommunity.mockRejectedValue(error);

      const { result } = renderHook(() => useLeaveCommunity(), { wrapper });

      await expect(
        result.current.mutateAsync('community-id')
      ).rejects.toThrow('Failed to leave community');
    });
  });
});