import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAuthIdOrThrow } from '../auth-helpers';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../constants';
import { createMockSupabase } from '../../../test-utils';

// Mock the core module
vi.mock('../../../shared', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('requireAuthentication', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    // Make getUser a proper mock function
    mockSupabase.auth.getUser = vi.fn();
  });

  it('should return user ID when authentication succeeds', async () => {
    // Arrange
    const expectedUserId = 'test-user-123';
    (mockSupabase.auth.getUser as jest.MockedFunction<typeof mockSupabase.auth.getUser>).mockResolvedValue({
      data: {
        user: {
          id: expectedUserId,
        },
      },
      error: null,
    });

    // Act
    const result = await getAuthIdOrThrow(mockSupabase);

    // Assert
    expect(result).toBe(expectedUserId);
    expect(mockSupabase.auth.getUser).toHaveBeenCalledOnce();
  });

  it('should throw authentication error when getUser returns error', async () => {
    // Arrange
    const userError = new Error('Auth failed');
    (mockSupabase.auth.getUser as jest.MockedFunction<typeof mockSupabase.auth.getUser>).mockResolvedValue({
      data: null,
      error: userError,
    });

    // Act & Assert
    await expect(
      getAuthIdOrThrow(mockSupabase, 'test operation'),
    ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
  });

  it('should throw authentication error when user data is missing', async () => {
    // Arrange
    (mockSupabase.auth.getUser as jest.MockedFunction<typeof mockSupabase.auth.getUser>).mockResolvedValue({
      data: null,
      error: null,
    });

    // Act & Assert
    await expect(getAuthIdOrThrow(mockSupabase)).rejects.toThrow(
      MESSAGE_AUTHENTICATION_REQUIRED,
    );
  });

  it('should throw authentication error when user is missing', async () => {
    // Arrange
    (mockSupabase.auth.getUser as jest.MockedFunction<typeof mockSupabase.auth.getUser>).mockResolvedValue({
      data: {
        user: null,
      },
      error: null,
    });

    // Act & Assert
    await expect(getAuthIdOrThrow(mockSupabase)).rejects.toThrow(
      MESSAGE_AUTHENTICATION_REQUIRED,
    );
  });

  it('should throw authentication error when user ID is missing', async () => {
    // Arrange
    (mockSupabase.auth.getUser as jest.MockedFunction<typeof mockSupabase.auth.getUser>).mockResolvedValue({
      data: {
        user: {
          id: null,
        },
      },
      error: null,
    });

    // Act & Assert
    await expect(getAuthIdOrThrow(mockSupabase)).rejects.toThrow(
      MESSAGE_AUTHENTICATION_REQUIRED,
    );
  });
});
