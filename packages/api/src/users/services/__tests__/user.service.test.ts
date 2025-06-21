import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserService } from '../user.service';
import { logger } from '@belongnetwork/core';
import type { UserData, UserFilter } from '@belongnetwork/types';

// Mock the logger
vi.mock('@belongnetwork/core', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the transformers
vi.mock('../../impl/userTransformer', () => ({
  toDomainUser: vi.fn(),
  forDbInsert: vi.fn(),
  forDbUpdate: vi.fn(),
}));

import { toDomainUser, forDbInsert, forDbUpdate } from '../../impl/userTransformer';

const mockLogger = vi.mocked(logger);
const mockToDomainUser = vi.mocked(toDomainUser);
const mockForDbInsert = vi.mocked(forDbInsert);
const mockForDbUpdate = vi.mocked(forDbUpdate);

describe('UserService', () => {
  let mockSupabase: any;
  let userService: ReturnType<typeof createUserService>;

  const mockDbUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    fullName: 'Test User',
    avatarUrl: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client - use proper query pattern like community service
    mockSupabase = {
      from: vi.fn(),
    };

    userService = createUserService(mockSupabase);

    // Setup default transformer mocks
    mockToDomainUser.mockReturnValue(mockUser);
    mockForDbInsert.mockReturnValue(mockDbUser);
    mockForDbUpdate.mockReturnValue(mockDbUser);
  });

  describe('fetchUsers', () => {
    it('should fetch users successfully', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbUser], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.fetchUsers();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockToDomainUser).toHaveBeenCalledWith(mockDbUser, 0, [mockDbUser]);
      expect(result).toEqual([mockUser]);
      expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Fetching users', { options: undefined });
    });

    it('should apply search filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbUser], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const searchOptions: UserFilter = { searchTerm: 'test' };

      // Act
      const result = await userService.fetchUsers(searchOptions);

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith(
        'email.ilike.%test%,first_name.ilike.%test%,last_name.ilike.%test%'
      );
      expect(result).toEqual([mockUser]);
    });

    it('should apply pagination when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbUser], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const paginationOptions: UserFilter = { page: 2, pageSize: 10 };

      // Act
      const result = await userService.fetchUsers(paginationOptions);

      // Assert
      expect(mockQuery.range).toHaveBeenCalledWith(10, 19); // page 2, size 10 -> from 10 to 19
      expect(result).toEqual([mockUser]);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockQueryResult = { data: [], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.fetchUsers();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.fetchUsers();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(userService.fetchUsers()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Failed to fetch users', { error: dbError });
    });
  });

  describe('fetchUserById', () => {
    it('should fetch user by ID successfully', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbUser, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.fetchUserById('user-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockToDomainUser).toHaveBeenCalledWith(mockDbUser);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: { code: 'PGRST116' } };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.fetchUserById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw database errors other than not found', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(userService.fetchUserById('user-123')).rejects.toThrow(dbError);
    });
  });

  describe('createUser', () => {
    const mockUserData: UserData = {
      email: 'newuser@example.com',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create user successfully', async () => {
      // Arrange
      const mockInsertResult = { data: mockDbUser, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.createUser('user-123', mockUserData);

      // Assert
      expect(mockForDbInsert).toHaveBeenCalledWith({ ...mockUserData, id: 'user-123' });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQuery.insert).toHaveBeenCalledWith(mockDbUser);
      expect(mockToDomainUser).toHaveBeenCalledWith(mockDbUser);
      expect(result).toEqual(mockUser);
      expect(mockLogger.info).toHaveBeenCalledWith('👤 API: Successfully created user', {
        id: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      const dbError = new Error('Insert failed');
      const mockInsertResult = { data: null, error: dbError };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(userService.createUser('user-123', mockUserData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Failed to create user', {
        email: mockUserData.email,
        accountId: 'user-123',
        error: dbError,
      });
    });

    it('should log debug message when starting creation', async () => {
      // Arrange
      const mockInsertResult = { data: mockDbUser, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await userService.createUser('user-123', mockUserData);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Creating user', {
        email: mockUserData.email,
        accountId: 'user-123',
      });
    });
  });

  describe('updateUser', () => {
    const mockUpdateData = {
      id: 'user-123',
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      // Arrange
      const mockUpdateResult = { data: mockDbUser, error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await userService.updateUser(mockUpdateData);

      // Assert
      expect(mockForDbUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockToDomainUser).toHaveBeenCalledWith(mockDbUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      const dbError = new Error('Update failed');
      const mockUpdateResult = { data: null, error: dbError };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(userService.updateUser(mockUpdateData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Failed to update user', {
        id: 'user-123',
        error: dbError,
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user successfully when user exists', async () => {
      // Arrange - Mock the existence check query
      const mockExistenceResult = { data: { id: 'user-123' }, error: null };
      const mockExistenceQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockExistenceResult),
      };
      
      // Mock the update query
      const mockUpdateResult = { error: null };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      
      // Set up from() to return different queries for different calls
      mockSupabase.from
        .mockReturnValueOnce(mockExistenceQuery) // First call for existence check
        .mockReturnValueOnce(mockUpdateQuery);   // Second call for update

      // Act
      const result = await userService.deleteUser('user-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockExistenceQuery.select).toHaveBeenCalledWith('id');
      expect(mockExistenceQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'user-123');
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('👤 API: Successfully deleted user', {
        id: 'user-123',
      });
    });

    it('should return early when user not found', async () => {
      // Arrange - Mock user not found
      const mockExistenceResult = { data: null, error: { code: 'PGRST116' } };
      const mockExistenceQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockExistenceResult),
      };
      
      mockSupabase.from.mockReturnValue(mockExistenceQuery);

      // Act
      const result = await userService.deleteUser('nonexistent-user');

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: User not found for deletion', {
        id: 'nonexistent-user',
      });
    });

    it('should throw error when database update fails', async () => {
      // Arrange - Mock successful existence check
      const mockExistenceResult = { data: { id: 'user-123' }, error: null };
      const mockExistenceQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockExistenceResult),
      };
      
      // Mock failed update
      const dbError = new Error('Delete failed');
      const mockUpdateResult = { error: dbError };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      
      mockSupabase.from
        .mockReturnValueOnce(mockExistenceQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act & Assert
      await expect(userService.deleteUser('user-123')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Failed to delete user', {
        id: 'user-123',
        error: dbError,
      });
    });
  });
});