import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthService } from '../auth.service';

// Mock fetchUserById
vi.mock('../../../users/impl/fetchUserById', () => ({
  fetchUserById: vi.fn(),
}));

describe('auth.service', () => {
  let mockSupabase: any;
  let mockClient: any;
  let authService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock objects
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
        signUp: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
      },
    };

    mockClient = {
      supabase: mockSupabase,
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      mapbox: {
        autocomplete: vi.fn(),
        reverseGeocode: vi.fn(),
      },
    };

    authService = createAuthService(mockSupabase);
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

      const result = await authService.getCurrentAuthUser();

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

      const result = await authService.getCurrentAuthUser();

      expect(result).toBeNull();
    });

    it('should return null on auth error', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth session missing' },
      });

      const result = await authService.getCurrentAuthUser();

      expect(result).toBeNull();
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      });

      await expect(authService.signOut()).resolves.toBeUndefined();
      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should throw on sign out error', async () => {
      const mockError = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({
        error: mockError,
      });

      await expect(authService.signOut()).rejects.toThrow('Sign out failed');
    });
  });
});