import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useResource } from '../../hooks/useResource';
import { createMockSupabase } from '../../../../test-utils';
import { createMockResourceInfo } from '../../__mocks__/';
import { createMockUser } from '../../../users/__mocks__';
import { createMockCommunity } from '../../../communities/__mocks__';
import { createDefaultTestWrapper } from '../../../../shared/__tests__/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../../users/types';
import type { Community } from '../../../communities/types';

// Global mocks for shared and config modules are now handled in vitest.setup.ts
// This eliminates redundant mock definitions across test files

// Mock the API functions
vi.mock('../../api', () => ({
  fetchResourceById: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchResourceById } from '../../api';
import { useUser } from '../../../users';
import { useCommunity } from '../../../communities';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchResourceById = vi.mocked(fetchResourceById);
const mockUseUser = vi.mocked(useUser);
const mockUseCommunity = vi.mocked(useCommunity);

describe('useResource', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockResourceInfo: ReturnType<typeof createMockResourceInfo>;
  let mockOwner: User;
  let mockCommunity: Community;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockOwner = createMockUser();
    mockCommunity = createMockCommunity();
    mockResourceInfo = createMockResourceInfo({
      ownerId: mockOwner.id,
      communityId: mockCommunity.id,
    });

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return a full Resource object composed from ResourceInfo + User + Community', async () => {
    // Arrange: Mock the API and related hooks
    mockFetchResourceById.mockResolvedValue(mockResourceInfo);
    mockUseUser.mockReturnValue(mockOwner);
    mockUseCommunity.mockReturnValue(mockCommunity);

    // Act
    const { result } = renderHook(() => useResource(mockResourceInfo.id), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const resource = result.current;

    // Assert: Should return full Resource object, not ResourceInfo
    expect(resource).toBeDefined();
    expect(resource).toEqual(
      expect.objectContaining({
        id: mockResourceInfo.id,
        title: mockResourceInfo.title,
        owner: mockOwner, // Full User object, not just ID
        community: mockCommunity, // Full Community object, not just ID
      }),
    );

    // Should NOT have ID references (ResourceInfo pattern)
    expect(resource).not.toHaveProperty('ownerId');
    expect(resource).not.toHaveProperty('communityId');

    // Verify API was called correctly
    expect(mockFetchResourceById).toHaveBeenCalledWith(
      mockSupabase,
      mockResourceInfo.id,
    );

    // Verify composition hooks were called with correct IDs
    expect(mockUseUser).toHaveBeenCalledWith(mockResourceInfo.ownerId);
    expect(mockUseCommunity).toHaveBeenCalledWith(mockResourceInfo.communityId);
  });

  it('should return null when resource is not found', async () => {
    // Arrange
    mockFetchResourceById.mockResolvedValue(null);
    mockUseUser.mockReturnValue(null);
    mockUseCommunity.mockReturnValue(null);

    // Act
    const { result } = renderHook(() => useResource('nonexistent-id'), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // Assert
    expect(result.current).toBeNull();
    expect(mockFetchResourceById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
  });

  it('should return null when owner is not found', async () => {
    // Arrange
    mockFetchResourceById.mockResolvedValue(mockResourceInfo);
    mockUseUser.mockReturnValue(null); // Owner not found
    mockUseCommunity.mockReturnValue(mockCommunity);

    // Act
    const { result } = renderHook(() => useResource(mockResourceInfo.id), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // Assert: Should return null if required owner data is missing
    expect(result.current).toBeNull();
  });
});
