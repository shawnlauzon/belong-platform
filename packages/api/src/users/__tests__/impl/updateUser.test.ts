import { describe, it, expect, vi, beforeEach, Mocked } from 'vitest';
import { faker } from '@faker-js/faker';
import { updateUser } from '../../impl/updateUser';
import { toDomainUser, forDbUpdate } from '../../impl/userTransformer';
import { supabase } from '@belongnetwork/core';
import type { User, UserData } from '@belongnetwork/types';
import type {
  PostgrestSingleResponse,
  PostgrestError,
} from '@supabase/supabase-js';
import {
  createMockDbProfile,
  createMockUserData,
} from '../../../test-utils/mocks';

// Mock the supabase client and logger
const mockFrom = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
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
  update: mockUpdate.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  select: mockSelect.mockReturnThis(),
  single: mockSingle,
});

// Set up the default mock implementation
mockFrom.mockImplementation(() => createQueryBuilder());

// Mock the userTransformer
const mockToDomainUser = vi.mocked(toDomainUser);
const mockForDbUpdate = vi.mocked(forDbUpdate);

let mockUserData: UserData;
let mockDbData: ProfileRow;

describe('updateUser', () => {
  const mockUserId = faker.string.uuid();
  const mockEmail = faker.internet.email();
  const mockLocation = {
    lat: faker.location.latitude(),
    lng: faker.location.longitude(),
  };

  const mockUpdateData = createMockUserData();
  const mockDbUpdateData = createMockDbProfile();

  const mockUpdatedUser = toDomainUser(mockDbUpdateData);

  const mockDbResponse = {
    id: mockUserId,
    email: mockEmail,
    user_metadata: {
      first_name: 'Updated',
      last_name: 'User',
      full_name: 'Updated User',
      avatar_url: 'https://example.com/updated-avatar.jpg',
      location: mockLocation,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mocks
    mockForDbUpdate.mockReturnValue(mockDbUpdateData);
    mockToDomainUser.mockReturnValue(mockUpdatedUser);

    // Default mock implementation
    mockSingle.mockResolvedValue({
      data: mockDbResponse,
      error: null,
      count: 1,
      status: 200,
      statusText: 'OK',
    } as PostgrestSingleResponse<unknown>);
  });

  it('should successfully update a user', async () => {
    // Act
    const result = await updateUser(mockUpdateData);

    // Assert
    // Verify the database was called with the correct data
    expect(mockForDbUpdate).toHaveBeenCalledWith(mockUpdateData);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(mockDbUpdateData);
    expect(mockEq).toHaveBeenCalledWith('id', mockUserId);
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockSingle).toHaveBeenCalled();

    // Verify the domain transformation was called
    expect(mockToDomainUser).toHaveBeenCalledWith(mockDbResponse);

    // Verify the result
    expect(result).toEqual(mockUpdatedUser);

    // Verify logging
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Updating user', {
      id: mockUserId,
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      '👤 API: Successfully updated user',
      {
        id: mockUserId,
        email: mockUpdatedUser.email,
      }
    );
  });

  it('should handle partial updates', async () => {
    // Arrange
    const partialUpdate = {
      id: mockUserId,
      first_name: 'Partial',
    };

    const partialDbUpdate = {
      user_metadata: {
        first_name: 'Partial',
        last_name: undefined,
        full_name: undefined,
        avatar_url: undefined,
        location: undefined,
      },
      updated_at: expect.any(String),
    };

    mockForDbUpdate.mockReturnValue(partialDbUpdate);

    // Act
    await updateUser(partialUpdate);

    // Assert
    expect(mockForDbUpdate).toHaveBeenCalledWith(partialUpdate);
    expect(mockUpdate).toHaveBeenCalledWith(partialDbUpdate);
  });

  it('should throw an error when database update fails', async () => {
    // Arrange
    const error = {
      message: 'Database error',
      details: 'Error details',
      hint: 'Error hint',
      code: '23505',
    } as PostgrestError;

    mockSingle.mockResolvedValueOnce({
      data: null,
      error,
      status: 400,
      statusText: 'Bad Request',
    } as PostgrestSingleResponse<null>);

    // Act & Assert
    await expect(updateUser(mockUpdateData)).rejects.toThrow(error);

    // Verify error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      '👤 API: Failed to update user',
      {
        id: mockUserId,
        error,
      }
    );
  });

  it('should log an error when an unexpected error occurs', async () => {
    // Arrange
    const error = new Error('Unexpected error');
    mockSingle.mockImplementationOnce(() => {
      throw error;
    });

    // Act & Assert
    await expect(updateUser(mockUpdateData)).rejects.toThrow(error);

    // Verify error was logged with stack trace
    expect(mockLogger.error).toHaveBeenCalledWith(
      '👤 API: Error updating user',
      {
        id: mockUserId,
        error: 'Unexpected error',
        stack: expect.any(String),
      }
    );
  });
});
