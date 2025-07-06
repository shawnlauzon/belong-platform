import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignOut } from '../../hooks/useSignOut';
import { createMockSupabase } from '@/test-utils';
import { createDefaultTestWrapper } from '@/test-utils/testWrapper';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';

// Mock the API functions
vi.mock('../../api', () => ({
  signOut: vi.fn(),
}));

import { useSupabase } from '@/shared';
import { signOut } from '../../api';

const mockUseSupabase = vi.mocked(useSupabase);
const mockSignOut = vi.mocked(signOut);

describe('useSignOut', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase();
    mockUseSupabase.mockReturnValue(mockSupabase);

    // Use shared test wrapper
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should complete sign out successfully', async () => {
    // Arrange
    mockSignOut.mockResolvedValue(undefined);

    // Act
    const { result } = renderHook(() => useSignOut(), { wrapper });
    await result.current.mutateAsync();

    // Assert: Should complete without throwing
    expect(mockSignOut).toHaveBeenCalledWith(mockSupabase);
  });
});
