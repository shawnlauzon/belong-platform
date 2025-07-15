import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateShoutout } from '../../hooks/useCreateShoutout';
import { createMockSupabase, createTestWrapper } from '../../../../test-utils';
import { createFakeShoutout } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createFakeResource } from '../../../resources/__fakes__';
import { createFakeGathering } from '../../../gatherings/__fakes__';
import type { ShoutoutResourceInput, ShoutoutGatheringInput } from '../../types';

// Mock the API functions
vi.mock('../../api/createShoutout', () => ({
  createResourceShoutout: vi.fn(),
  createGatheringShoutout: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createResourceShoutout, createGatheringShoutout } from '../../api/createShoutout';
import { useCurrentUser } from '../../../auth';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateResourceShoutout = vi.mocked(createResourceShoutout);
const mockCreateGatheringShoutout = vi.mocked(createGatheringShoutout);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useCreateShoutout', () => {
  let wrapper: ReturnType<typeof createTestWrapper>['wrapper'];
  let queryClient: ReturnType<typeof createTestWrapper>['queryClient'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let mockCurrentUser: ReturnType<typeof createFakeUser>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockCurrentUser = createFakeUser();
    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);
    mockUseCurrentUser.mockReturnValue({
      data: mockCurrentUser,
    } as ReturnType<typeof useCurrentUser>);

    // Use shared test wrapper
    ({ wrapper, queryClient } = createTestWrapper());
  });

  it('should create resource shoutout with data from cache', async () => {
    // Arrange: Create test data for resource shoutout
    const mockResource = createFakeResource();
    const shoutoutData: ShoutoutResourceInput = {
      resourceId: mockResource.id,
      message: 'Thank you for helping me with this!',
    };

    // Mock queryClient to return the resource data
    vi.spyOn(queryClient, 'getQueryData').mockReturnValue(mockResource);

    const expectedShoutout = createFakeShoutout({
      fromUserId: mockCurrentUser.id,
      toUserId: mockResource.ownerId,
      message: shoutoutData.message,
    });

    mockCreateResourceShoutout.mockResolvedValue(expectedShoutout);

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });
    const createdShoutout = await result.current.mutateAsync(shoutoutData);

    // Assert: Should return shoutout with auto-assigned fromUserId and toUserId from resource
    expect(createdShoutout).toBeDefined();
    expect(createdShoutout).toEqual(
      expect.objectContaining({
        id: expectedShoutout.id,
        message: shoutoutData.message,
        fromUserId: mockCurrentUser.id,
        toUserId: mockResource.ownerId,
      }),
    );

    // Verify API was called with combined data
    expect(mockCreateResourceShoutout).toHaveBeenCalledWith(mockSupabase, {
      ...shoutoutData,
      ...mockResource,
      toUserId: mockResource.ownerId,
    });
  });

  it('should create gathering shoutout with data from cache', async () => {
    // Arrange: Create test data for gathering shoutout
    const mockGathering = createFakeGathering();
    const shoutoutData: ShoutoutGatheringInput = {
      gatheringId: mockGathering.id,
      message: 'Thank you for organizing this event!',
    };

    // Mock queryClient to return the gathering data
    vi.spyOn(queryClient, 'getQueryData').mockReturnValue(mockGathering);

    const expectedShoutout = createFakeShoutout({
      fromUserId: mockCurrentUser.id,
      toUserId: mockGathering.organizerId,
      message: shoutoutData.message,
    });

    mockCreateGatheringShoutout.mockResolvedValue(expectedShoutout);

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });
    const createdShoutout = await result.current.mutateAsync(shoutoutData);

    // Assert: Should return shoutout with auto-assigned fromUserId and toUserId from gathering
    expect(createdShoutout).toBeDefined();
    expect(createdShoutout).toEqual(
      expect.objectContaining({
        id: expectedShoutout.id,
        message: shoutoutData.message,
        fromUserId: mockCurrentUser.id,
        toUserId: mockGathering.organizerId,
      }),
    );

    // Verify API was called with combined data
    expect(mockCreateGatheringShoutout).toHaveBeenCalledWith(mockSupabase, {
      ...shoutoutData,
      ...mockGathering,
      toUserId: mockGathering.organizerId,
    });
  });

  it('should handle resource not found error', async () => {
    // Arrange: Create test data but don't mock resource in cache
    const shoutoutData: ShoutoutResourceInput = {
      resourceId: 'nonexistent-resource',
      message: 'Thank you!',
    };

    // Mock queryClient to return undefined (resource not found)
    vi.spyOn(queryClient, 'getQueryData').mockReturnValue(undefined);

    // Act & Assert: Should throw resource not found error
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    await expect(result.current.mutateAsync(shoutoutData)).rejects.toThrow(
      'Resource not found',
    );
    expect(mockCreateResourceShoutout).not.toHaveBeenCalled();
  });

  it('should handle gathering not found error', async () => {
    // Arrange: Create test data but don't mock gathering in cache
    const shoutoutData: ShoutoutGatheringInput = {
      gatheringId: 'nonexistent-gathering',
      message: 'Thank you!',
    };

    // Mock queryClient to return undefined (gathering not found)
    vi.spyOn(queryClient, 'getQueryData').mockReturnValue(undefined);

    // Act & Assert: Should throw gathering not found error
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    await expect(result.current.mutateAsync(shoutoutData)).rejects.toThrow(
      'Gathering not found',
    );
    expect(mockCreateGatheringShoutout).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    // Arrange: Create test data with valid resource in cache
    const mockResource = createFakeResource();
    const shoutoutData: ShoutoutResourceInput = {
      resourceId: mockResource.id,
      message: 'Thank you!',
    };

    // Mock queryClient to return the resource data
    vi.spyOn(queryClient, 'getQueryData').mockReturnValue(mockResource);

    // Mock API to fail
    mockCreateResourceShoutout.mockRejectedValue(new Error('API failed'));

    // Act & Assert: Should propagate API errors
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    await expect(result.current.mutateAsync(shoutoutData)).rejects.toThrow(
      'API failed',
    );
    expect(mockCreateResourceShoutout).toHaveBeenCalledWith(mockSupabase, {
      ...shoutoutData,
      ...mockResource,
      toUserId: mockResource.ownerId,
    });
  });
});
