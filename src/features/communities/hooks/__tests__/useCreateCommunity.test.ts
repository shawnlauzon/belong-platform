import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateCommunity } from '../useCreateCommunity';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeCommunityInput, createFakeCommunity } from '../../__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import type { QueryClient } from '@tanstack/react-query';

// Mock the API functions
vi.mock('../../api', () => ({
  createCommunity: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createCommunity } from '../../api';
import { communityKeys } from '../../queries';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateCommunity = vi.mocked(createCommunity);

describe('useCreateCommunity', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    const testWrapper = createDefaultTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;

    // Spy on queryClient methods to verify cache invalidation
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('should create community and invalidate appropriate caches on success', async () => {
    // Arrange: Create test data using factories
    const fakeCommunity = createFakeCommunity();
    const communityData = createFakeCommunityInput();

    mockCreateCommunity.mockResolvedValue(fakeCommunity);

    // Act
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    await waitFor(async () => {
      await result.current.mutateAsync(communityData);
    });

    // Assert: Should return Community
    expect(mockCreateCommunity).toHaveBeenCalledWith(mockSupabase, communityData);

    // Verify community cache invalidation
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: communityKeys.lists(),
    });

    // Note: Trust score cache invalidation happens in onSuccess but requires async call
    // so it's harder to test directly. The hook will attempt to invalidate the current user's trust scores.
  });

  it('should return created community with correct properties', async () => {
    // Arrange: Create test data using factories
    const fakeCommunity = createFakeCommunity();
    const communityData = createFakeCommunityInput();

    mockCreateCommunity.mockResolvedValue(fakeCommunity);

    // Act
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });
    const createdCommunity = await result.current.mutateAsync(communityData);

    // Assert: Should return Community with expected properties
    expect(createdCommunity).toBeDefined();
    expect(createdCommunity).toEqual(
      expect.objectContaining({
        id: fakeCommunity.id,
        name: fakeCommunity.name,
        type: fakeCommunity.type,
      }),
    );
  });

  it('should not invalidate cache on creation error', async () => {
    // Arrange: Mock API to throw error
    const communityData = createFakeCommunityInput();
    const error = new Error('Failed to create community');
    mockCreateCommunity.mockRejectedValue(error);

    // Act & Assert
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    await expect(result.current.mutateAsync(communityData)).rejects.toThrow(
      'Failed to create community',
    );

    // Verify no cache invalidation on error
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });

  it('should throw error when createCommunity returns null', async () => {
    // Arrange: Mock API to return null
    const communityData = createFakeCommunityInput();
    mockCreateCommunity.mockResolvedValue(null);

    // Act & Assert
    const { result } = renderHook(() => useCreateCommunity(), { wrapper });

    await expect(result.current.mutateAsync(communityData)).rejects.toThrow(
      'Failed to create community',
    );

    // Verify API was called
    expect(mockCreateCommunity).toHaveBeenCalledWith(mockSupabase, communityData);

    // Verify no cache invalidation on null result
    expect(queryClient.invalidateQueries).not.toHaveBeenCalled();
  });
});