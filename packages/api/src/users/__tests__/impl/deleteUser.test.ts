import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUser } from '../../impl/deleteUser';
import { supabase } from '@belongnetwork/core';
import { toDomainUser } from '../../impl/userTransformer';
import { createMockUser } from '../../../test-utils/mocks';
import type { User } from '@belongnetwork/types';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

// Mock the supabase client and logger
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
};

vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: mockFrom,
  },
  logger: mockLogger,
}));

// Mock the query builder chain
const createQueryBuilder = () => ({
  select: mockSelect.mockReturnThis(),
  update: mockUpdate.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  single: mockSingle,
});

// Set up the default mock implementation
mockFrom.mockImplementation(() => createQueryBuilder());

// Mock the userTransformer
const mockToDomainUser = vi.mocked(toDomainUser);

describe('deleteUser', () => {
  let mockDomainUser: User;
  let mockDbData: any;
  const mockUserId = 'test-user-id';
  const mockEmail = 'test@example.com';
  const mockNow = new Date().toISOString();

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a domain user first
    mockDomainUser = createMockUser({
      id: mockUserId,
      email: mockEmail,
    });
    
    // Create mock database data
    mockDbData = {
      id: mockUserId,
      email: mockEmail,
      user_metadata: {
        first_name: mockDomainUser.firstName,
        last_name: mockDomainUser.lastName,
        full_name: mockDomainUser.fullName,
        avatar_url: mockDomainUser.avatarUrl,
        location: mockDomainUser.location,
      },
      created_at: mockDomainUser.createdAt.toISOString(),
      updated_at: mockDomainUser.updatedAt.toISOString(),
    };

    // Reset mocks
    mockToDomainUser.mockReturnValue(mockDomainUser);
    
    // Default mock implementation for fetch
    mockSelect.mockReturnThis();
    mockEq.mockReturnThis();
    mockSingle.mockResolvedValueOnce({
      data: mockDbData,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as PostgrestSingleResponse<typeof mockDbData>);
    
    // Default mock implementation for update
    mockUpdate.mockReturnThis();
    mockSingle.mockResolvedValueOnce({
      data: mockDbData,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
    } as PostgrestSingleResponse<typeof mockDbData>);
  });

  it('should soft delete a user and return the deleted user', async () => {
    // Act
    const result = await deleteUser(mockUserId);

    // Assert
    expect(result).toEqual(mockDomainUser);
    
    // Verify fetch user was called
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
    
    // Verify update was called with deleted_at
    expect(mockUpdate).toHaveBeenCalledWith({
      deleted_at: expect.any(String),
    });
    expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
    
    // Verify logging
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Deleting user', { id: mockUserId });
    expect(mockLogger.info).toHaveBeenCalledWith('👤 API: Successfully deleted user', {
      id: mockUserId,
      email: mockEmail,
    });
  });

  it('should return null if user is not found', async () => {
    // Arrange
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
      count: null,
      status: 404,
      statusText: 'Not Found',
    } as PostgrestSingleResponse<null>);

    // Act
    const result = await deleteUser('non-existent-id');

    // Assert
    expect(result).toBeNull();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      '👤 API: User not found for deletion',
      { id: 'non-existent-id' }
    );
  });

  it('should throw an error when user fetch fails', async () => {
    // Arrange
    const fetchError = { 
      name: 'PostgrestError',
      message: 'Database error',
      details: 'Connection error',
      hint: 'Check your connection',
      code: '08006'
    };
    
    mockSingle.mockReset();
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: fetchError,
      count: null,
      status: 500,
      statusText: 'Internal Server Error',
    } as PostgrestSingleResponse<null>);

    // Act & Assert
    await expect(deleteUser(mockUserId)).rejects.toThrow(fetchError.message);
    
    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Error deleting user', {
      id: mockUserId,
      error: 'Database error',
      stack: expect.any(String),
    });
  });

  it('should throw an error when user update fails', async () => {
    // Arrange
    const updateError = { 
      name: 'PostgrestError',
      message: 'Update failed',
      details: 'Constraint violation',
      hint: 'Check constraints',
      code: '23505'
    };
    
    // First call (fetch) succeeds, second (update) fails
    mockSingle.mockReset();
    mockSingle
      .mockResolvedValueOnce({
        data: mockDbData,
        error: null,
        count: null,
        status: 200,
        statusText: 'OK',
      } as PostgrestSingleResponse<typeof mockDbData>)
      .mockResolvedValueOnce({
        data: null,
        error: updateError,
        count: null,
        status: 400,
        statusText: 'Bad Request',
      } as PostgrestSingleResponse<null>);

    // Act & Assert
    await expect(deleteUser(mockUserId)).rejects.toThrow(updateError.message);
    
    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      '👤 API: Failed to delete user',
      { id: mockUserId, error: updateError }
    );
  });

  it('should handle unexpected errors', async () => {
    // Arrange
    const error = new Error('Unexpected error');
    mockSingle.mockImplementationOnce(() => {
      throw error;
    });

    // Act & Assert
    await expect(deleteUser(mockUserId)).rejects.toThrow(error);
    
    // Verify error was logged with stack trace
    expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Error deleting user', {
      id: mockUserId,
      error: 'Unexpected error',
      stack: expect.any(String),
    });
  });
});
