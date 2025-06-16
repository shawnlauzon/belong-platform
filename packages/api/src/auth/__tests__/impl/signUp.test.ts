import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { signUp } from '../../impl/signUp';
import { createMockUser } from '../../../test-utils/mocks';
import { supabase, logger } from '@belongnetwork/core';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
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

describe('signUp', () => {
  const email = faker.internet.email();
  const password = faker.internet.password();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const mockAccount = createMockUser();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.signUp.mockReset();
  });

  it('should sign up a new user with required fields', async () => {
    // Arrange
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: mockAccount.id,
          email,
          user_metadata: {
            first_name: '',
            last_name: '',
            full_name: '',
          },
          created_at: createdAt,
          updated_at: updatedAt,
        },
        session: {} as any,
      },
      error: null,
    });

    // Act
    const result = await signUp(email, password);

    // Assert
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email,
      password,
      options: {
        data: {
          first_name: '',
          last_name: '',
          full_name: '',
        },
      },
    });

    expect(result).toEqual({
      id: mockAccount.id,
      email,
      first_name: '',
      last_name: '',
      full_name: '',
      avatar_url: undefined,
      location: undefined,
      created_at: new Date(createdAt),
      updated_at: new Date(updatedAt),
    });

    expect(mockLogger.info).toHaveBeenCalledWith('🔐 API: Successfully signed up', {
      userId: mockAccount.id,
    });
  });

  it('should sign up a new user with metadata', async () => {
    // Arrange
    const createdAt = new Date().toISOString();
    const updatedAt = new Date().toISOString();
    
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: mockAccount.id,
          email,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
          },
          created_at: createdAt,
          updated_at: updatedAt,
        },
        session: {} as any,
      },
      error: null,
    });

    // Act
    const result = await signUp(email, password, { firstName, lastName });

    // Assert
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
      },
    });

    expect(result).toEqual({
      id: mockAccount.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      avatar_url: undefined,
      location: undefined,
      created_at: new Date(createdAt),
      updated_at: new Date(updatedAt),
    });
  });

  it('should throw an error if sign up fails', async () => {
    // Arrange
    const error = new Error('Email already in use');
    mockSupabase.auth.signUp.mockRejectedValueOnce(error);

    // Act & Assert
    await expect(signUp(email, password)).rejects.toThrow('Email already in use');
    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(String), { error });
  });

  it('should throw an error if no user data is returned', async () => {
    // Arrange
    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: {
        user: null,
        session: null,
      },
      error: null,
    });

    // Act & Assert
    await expect(signUp(email, password)).rejects.toThrow('No user data returned from sign up');
  });
});
