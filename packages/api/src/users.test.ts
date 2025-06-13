import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  fetchUser,
  fetchUsers,
  updateUser,
  useUser,
  useUsers,
  useUpdateUser,
} from './users';
import { createMockUser, createMockDbProfile } from './test-utils/mocks';
import { ReactQueryWrapper } from './test-utils/test-utils';
import type { UserFilter, UpdateUserData } from '@belongnetwork/types';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            or: vi.fn(() => ({
              range: vi.fn(),
            })),
            range: vi.fn(),
          })),
        })),
        order: vi.fn(() => ({
          or: vi.fn(() => ({
            range: vi.fn(),
          })),
          range: vi.fn(),
        })),
        or: vi.fn(() => ({
          range: vi.fn(),
        })),
        range: vi.fn(),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSupabase = vi.mocked(await import('@belongnetwork/core')).supabase;
const mockLogger = vi.mocked(await import('@belongnetwork/core')).logger;

describe('User Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchUser', () => {
    it('should successfully fetch a user by ID', async () => {
      // Arrange
      const mockProfile = createMockDbProfile();
      const userId = mockProfile.id;

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const result = await fetchUser(userId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(result).toMatchObject({
        id: mockProfile.id,
        email: mockProfile.email,
        first_name: mockProfile.user_metadata?.first_name || '',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '👤 API: Successfully fetched profile',
        {
          userId,
          name: result?.full_name,
        }
      );
    });

    it('should return null when user is not found', async () => {
      // Arrange
      const userId = faker.string.uuid();
      const notFoundError = { code: 'PGRST116' };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: notFoundError,
            }),
          }),
        }),
      });

      // Act
      const result = await fetchUser(userId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      // Arrange
      const userId = faker.string.uuid();
      const dbError = new Error('Database connection failed');

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(fetchUser(userId)).rejects.toBeInstanceOf(Error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '👤 API: Error fetching profile',
        { userId, error: dbError }
      );
    });
  });

  describe('fetchUsers', () => {
    it('should successfully fetch users with default pagination', async () => {
      // Arrange
      const mockProfiles = Array.from({ length: 3 }, () => createMockDbProfile());
      const totalCount = 10;

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
              count: totalCount,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchUsers();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
          }),
        ]),
        count: totalCount,
        page: 1,
        pageSize: 20,
      });
      expect(result.data).toHaveLength(3);
    });

    it('should apply search filter when provided', async () => {
      // Arrange
      const searchTerm = 'john';
      const filters: UserFilter = { searchTerm, page: 1, pageSize: 10 };
      const mockProfiles = [createMockDbProfile()];

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchUsers(filters);

      // Assert
      expect(mockQuery.select().order().or).toHaveBeenCalledWith(
        `user_metadata->>first_name.ilike.%${searchTerm}%,user_metadata->>last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
      );
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should handle custom pagination parameters', async () => {
      // Arrange
      const filters: UserFilter = { page: 3, pageSize: 5 };
      const mockProfiles = Array.from({ length: 5 }, () => createMockDbProfile());

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
              count: 25,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchUsers(filters);

      // Assert
      expect(mockQuery.select().order().range).toHaveBeenCalledWith(10, 14); // (page-1)*pageSize to (page-1)*pageSize + pageSize - 1
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(5);
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
              count: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchUsers()).rejects.toBeInstanceOf(Error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '👤 API: Failed to fetch users',
        { error: dbError }
      );
    });
  });

  describe('updateUser', () => {
    it('should successfully update user profile', async () => {
      // Arrange
      const mockUser = createMockUser();
      const updateData: UpdateUserData = {
        first_name: 'Updated',
        last_name: 'Name',
        email: 'updated@example.com',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const updatedProfile = createMockDbProfile({
        id: mockUser.id,
        user_metadata: {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          email: updateData.email,
          full_name: `${updateData.first_name} ${updateData.last_name}`,
        },
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const result = await updateUser(updateData);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(result).toMatchObject({
        id: mockUser.id,
        first_name: updateData.first_name,
        last_name: updateData.last_name,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '👤 API: Successfully updated profile',
        { userId: result.id }
      );
    });

    it('should require authentication to update profile', async () => {
      // Arrange
      const updateData: UpdateUserData = {
        first_name: 'Updated',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(updateUser(updateData)).rejects.toBeInstanceOf(Error);
    });

    it('should handle update errors', async () => {
      // Arrange
      const mockUser = createMockUser();
      const updateData: UpdateUserData = {
        first_name: 'Updated',
      };
      const updateError = new Error('Update failed');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: updateError,
              }),
            }),
          }),
        }),
      });

      // Act & Assert
      await expect(updateUser(updateData)).rejects.toBeInstanceOf(Error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '👤 API: Failed to update profile',
        { error: updateError }
      );
    });
  });
});

describe('User Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useUser', () => {
    it('should fetch user successfully', async () => {
      // Arrange
      const mockProfile = createMockDbProfile();
      const userId = mockProfile.id;

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      });

      // Act
      const { result } = renderHook(() => useUser(userId), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toMatchObject({
        id: mockProfile.id,
        email: mockProfile.email,
      });
    });

    it('should not fetch when userId is empty', () => {
      // Act
      const { result } = renderHook(() => useUser(''), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      expect(result.current.isIdle).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('useUsers', () => {
    it('should fetch users list successfully', async () => {
      // Arrange
      const mockProfiles = Array.from({ length: 3 }, () => createMockDbProfile());
      const filters: UserFilter = { page: 1, pageSize: 10 };

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: mockProfiles,
              error: null,
              count: 3,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useUsers(filters), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data?.data).toHaveLength(3);
      expect(result.current.data?.count).toBe(3);
    });

    it('should handle search filters', async () => {
      // Arrange
      const searchTerm = 'test';
      const filters: UserFilter = { searchTerm };
      const mockProfiles = [createMockDbProfile()];

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockProfiles,
                error: null,
                count: 1,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useUsers(filters), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockQuery.select().order().or).toHaveBeenCalledWith(
        expect.stringContaining(searchTerm)
      );
    });
  });

  describe('useUpdateUser', () => {
    it('should update user and invalidate cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const updateData: UpdateUserData = {
        first_name: 'Updated',
        last_name: 'Name',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const updatedProfile = createMockDbProfile({
        id: mockUser.id,
        user_metadata: {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          full_name: `${updateData.first_name} ${updateData.last_name}`,
        },
      });

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: updatedProfile,
                error: null,
              }),
            }),
          }),
        }),
      });

      // Act
      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(updateData);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '👤 API: Profile updated successfully',
        { userId: expect.any(String) }
      );
    });

    it('should handle update errors', async () => {
      // Arrange
      const updateData: UpdateUserData = {
        first_name: 'Updated',
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useUpdateUser(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(updateData);

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(result.current.error).toBeInstanceOf(Error);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '👤 API: Failed to update profile',
        { error: expect.any(Error) }
      );
    });
  });
});