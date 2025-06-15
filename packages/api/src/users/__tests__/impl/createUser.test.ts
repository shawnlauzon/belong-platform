import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUser } from '../../impl/createUser';
import { supabase } from '@belongnetwork/core';
import { toDomainUser, forDbInsert } from '../../impl/userTransformer';
import type { User, UserData, Database } from '@belongnetwork/types';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { createMockUser } from '../../../test-utils/mocks';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

// Mock the supabase client and logger
const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

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
  insert: mockInsert.mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  single: mockSingle,
});

// Set up the default mock implementation
mockFrom.mockImplementation(() => createQueryBuilder());

// Mock the userTransformer
const mockToDomainUser = vi.mocked(toDomainUser);
const mockForDbInsert = vi.mocked(forDbInsert);

describe('createUser', () => {
  let mockUserData: UserData;
  let mockDbData: ProfileRow;
  let mockDomainUser: User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create a domain user first
    mockDomainUser = createMockUser();
    
    // Create the input data (UserData) from the domain user
    mockUserData = {
      email: mockDomainUser.email,
      firstName: mockDomainUser.firstName,
      lastName: mockDomainUser.lastName,
      fullName: mockDomainUser.fullName,
      avatarUrl: mockDomainUser.avatarUrl,
      location: mockDomainUser.location,
    };
    
    // Convert to database format using the transformer
    // This will be the expected database row structure
    mockDbData = {
      id: mockDomainUser.id,
      email: mockDomainUser.email,
      user_metadata: {
        first_name: mockDomainUser.firstName,
        last_name: mockDomainUser.lastName,
        full_name: mockDomainUser.fullName,
        avatar_url: mockDomainUser.avatarUrl,
        location: mockDomainUser.location,
      },
      created_at: mockDomainUser.createdAt.toISOString(),
      updated_at: mockDomainUser.updatedAt.toISOString(),
    } as ProfileRow;

    // Reset mocks
    mockForDbInsert.mockReturnValue(mockDbData);
    mockToDomainUser.mockReturnValue(mockDomainUser);

    // Default mock implementation
    mockSingle.mockResolvedValue({
      data: mockDbData,
      error: null,
      count: null, // Supabase single() returns null for count
      status: 201,
      statusText: 'Created',
    } as PostgrestSingleResponse<typeof mockDbData>);
  });

  it('should create a new user successfully', async () => {
    // Act
    const result = await createUser(mockUserData);

    // Assert
    expect(mockForDbInsert).toHaveBeenCalledWith(mockUserData);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockInsert).toHaveBeenCalledWith(mockDbData);
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockSingle).toHaveBeenCalled();
    expect(mockToDomainUser).toHaveBeenCalledWith(mockDbData);
    expect(result).toEqual(mockDomainUser);

    // Verify logging
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Creating user', {
      email: mockUserData.email,
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      '👤 API: Successfully created user',
      {
        id: mockDomainUser.id,
        email: mockDomainUser.email,
      }
    );
  });

  it('should throw an error when database insert fails', async () => {
    // Arrange
    const error = { 
      name: 'PostgrestError',
      message: 'Database error',
      details: 'Error details',
      hint: 'Hint',
      code: '23505' // Example PostgreSQL error code
    } as const;
    
    vi.mocked(supabase.from('').insert('').select('').single).mockResolvedValue({
      data: null,
      error,
      count: null, // Supabase single() returns null for count
      status: 400,
      statusText: 'Bad Request'
    } as PostgrestSingleResponse<null>);

    // Act & Assert
    await expect(createUser(mockUserData)).rejects.toThrow(error.message);

    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      '👤 API: Failed to create user',
      {
        email: mockUserData.email,
        error,
      }
    );
  });

  it('should create a user with minimal required fields', async () => {
    // Arrange
    const minimalDomainUser = createMockUser({
      email: 'minimal@example.com',
      firstName: 'Minimal',
      lastName: '',
      fullName: 'Minimal',
      avatarUrl: undefined,
      location: undefined
    });
    
    // Create a minimal user data object with required fields
    const minimalUserData = {
      id: minimalDomainUser.id, // Include id for the test
      email: minimalDomainUser.email,
      firstName: minimalDomainUser.firstName,
      // Other required fields with default values
      lastName: '',
      fullName: minimalDomainUser.firstName,
      avatarUrl: undefined,
      location: undefined
    };
    
    // Create mock database data using the transformer
    const minimalDbData = forDbInsert(minimalUserData);
    
    // Mock the transformer functions
    mockForDbInsert.mockReturnValueOnce(minimalDbData);
    mockToDomainUser.mockReturnValueOnce(minimalDomainUser);

    // Act - create user with minimal required fields
    const result = await createUser(minimalUserData);

    // Assert
    expect(mockForDbInsert).toHaveBeenCalledWith(minimalUserData);
    expect(mockInsert).toHaveBeenCalledWith(minimalDbData);
    expect(result).toEqual(minimalDomainUser);
  });

  it('should handle unexpected errors', async () => {
    // Arrange
    const error = new Error('Unexpected error');
    mockSingle.mockImplementationOnce(() => {
      throw error;
    });

    // Act & Assert
    await expect(createUser(mockUserData)).rejects.toThrow(error);

    // Verify error was logged with stack trace
    expect(mockLogger.error).toHaveBeenCalledWith(
      '👤 API: Error creating user',
      {
        email: mockUserData.email,
        error: 'Unexpected error',
        stack: expect.any(String),
      }
    );
  });
});
