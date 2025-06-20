import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signIn, signUp, signOut, getCurrentAuthUser, getCurrentUser } from '../auth.service';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetchUserById
vi.mock('../../../users/impl/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

describe('auth.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
  });

  describe('getCurrentAuthUser', () => {
    it('should return auth user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { first_name: 'John' },
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await getCurrentAuthUser();

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentAuthUser();

      expect(result).toBeNull();
    });

    it('should return null on auth error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      });

      const result = await getCurrentAuthUser();

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      await expect(signOut()).resolves.toBeUndefined();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw on sign out error', async () => {
      const mockError = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });
});