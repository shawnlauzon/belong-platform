import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signOut } from '../../impl/signOut';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('signOut', () => {
  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
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
