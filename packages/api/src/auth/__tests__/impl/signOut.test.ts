import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signOut } from '../../impl/signOut';
import { supabase, logger } from '@belongnetwork/core';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSupabase = vi.mocked(supabase);
const mockLogger = vi.mocked(logger);

describe('signOut', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.signOut.mockReset();
  });

  it('should sign out successfully', async () => {
    // Arrange
    mockSupabase.auth.signOut.mockResolvedValueOnce({
      error: null,
    });

    // Act
    await signOut();

    // Assert
    expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith('🔐 API: Successfully signed out');
  });

  it('should throw an error if sign out fails', async () => {
    // Arrange
    const error = new Error('Failed to sign out');
    mockSupabase.auth.signOut.mockResolvedValueOnce({
      error,
    });

    // Act & Assert
    await expect(signOut()).rejects.toThrow('Failed to sign out');
    expect(mockLogger.error).toHaveBeenCalledWith('🔐 API: Failed to sign out', { error });
  });
});
