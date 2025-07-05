import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { createMockSupabase } from '@/test-utils';
import { createMockUser } from '@/features/users/__mocks__';
import { createDefaultTestWrapper } from '@/shared/__tests__/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { User } from '@/features/users/types';

// Mock the API functions
vi.mock('../../api', () => ({
  getCurrentUser: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { getCurrentUser } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe('useCurrentUser', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;
  let mockUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock data using factories
    mockUser = createMockUser();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return User when authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(mockUser);

    // Act
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    const user = result.current;

    // Assert: Should return User object
    expect(user).toBeDefined();
    expect(user).toEqual(
      expect.objectContaining({
        id: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
      }),
    );

    // Verify API was called correctly
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
  });

  it('should return null when not authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useCurrentUser(), { wrapper });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // Assert
    expect(result.current).toBeNull();
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
  });
});