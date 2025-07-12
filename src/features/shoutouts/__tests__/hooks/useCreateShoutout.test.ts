import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateShoutout } from '../../hooks/useCreateShoutout';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeShoutout } from '../../__fakes__';
import { createFakeUser } from '../../../users/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';
import type { ShoutoutInput } from '../../types';

// Mock the API functions
vi.mock('../../api', () => ({
  createShoutout: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { createShoutout } from '../../api';
import { useCurrentUser } from '../../../auth';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateShoutout = vi.mocked(createShoutout);
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('useCreateShoutout', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
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
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should create shoutout without requiring fromUserId in data', async () => {
    // Arrange: Create test data without fromUserId (it should be auto-assigned)
    const shoutoutData: ShoutoutInput = {
      toUserId: 'user-456',
      resourceId: 'resource-789',
      message: 'Thank you for helping me with this!',
    };

    const expectedShoutoutInfo = createFakeShoutout({
      fromUserId: mockCurrentUser.id, // Should be auto-assigned
      toUserId: shoutoutData.toUserId,
      resourceId: shoutoutData.resourceId,
      message: shoutoutData.message,
    });

    mockCreateShoutout.mockResolvedValue(expectedShoutoutInfo);

    // Act
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });
    const createdShoutout = await result.current.mutateAsync(shoutoutData);

    // Assert: Should return ShoutoutInfo with auto-assigned fromUserId
    expect(createdShoutout).toBeDefined();
    expect(createdShoutout).toEqual(
      expect.objectContaining({
        id: expectedShoutoutInfo.id,
        message: shoutoutData.message,
        fromUserId: mockCurrentUser.id, // Auto-assigned by API
        toUserId: shoutoutData.toUserId,
        resourceId: shoutoutData.resourceId,
      }),
    );

    // Verify API was called with correct parameters
    expect(mockCreateShoutout).toHaveBeenCalledWith(mockSupabase, shoutoutData);
  });

  it('should handle API errors gracefully', async () => {
    // Arrange: Create test data
    const shoutoutData: ShoutoutInput = {
      toUserId: 'user-456',
      resourceId: 'resource-789',
      message: 'Thank you!',
    };

    // Mock API to fail
    mockCreateShoutout.mockRejectedValue(new Error('API failed'));

    // Act & Assert: Should propagate API errors
    const { result } = renderHook(() => useCreateShoutout(), { wrapper });

    await expect(result.current.mutateAsync(shoutoutData)).rejects.toThrow(
      'API failed',
    );
    expect(mockCreateShoutout).toHaveBeenCalledWith(mockSupabase, shoutoutData);
  });
});
