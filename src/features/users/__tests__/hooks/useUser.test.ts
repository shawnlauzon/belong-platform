import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../../hooks/useUser';
import { createMockSupabase } from '../../../../test-utils';
import { createMockUser } from '../../__mocks__/';
import { createDefaultTestWrapper } from '../../../../shared/__tests__/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { User } from '../../types';

// Mock the API functions
vi.mock('../../api', () => ({
  fetchUserById: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { fetchUserById } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockFetchUserById = vi.mocked(fetchUserById);

describe('useUser', () => {
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

  it('should return a User object', async () => {
    // Arrange: Mock the API
    mockFetchUserById.mockResolvedValue(mockUser);

    // Act
    const { result } = renderHook(() => useUser(mockUser.id), {
      wrapper,
    });

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
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        email: mockUser.email,
      }),
    );

    // Verify API was called correctly
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      mockUser.id,
    );
  });

  it('should return null when user is not found', async () => {
    // Arrange
    mockFetchUserById.mockResolvedValue(null);

    // Act
    const { result } = renderHook(() => useUser('nonexistent-id'), {
      wrapper,
    });

    // Wait for the query to complete
    await waitFor(() => {
      expect(result.current).toBeNull();
    });

    // Assert
    expect(result.current).toBeNull();
    expect(mockFetchUserById).toHaveBeenCalledWith(
      mockSupabase,
      'nonexistent-id',
    );
  });
});