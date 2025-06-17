import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUser } from '../../impl/deleteUser';
import { createMockUser } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

// Mock the transformer
vi.mock('../../impl/userTransformer', () => ({
  toDomainUser: vi.fn(),
}));

describe('deleteUser', () => {
  const mockUser = createMockUser();
  let mockSupabase: any;
  let mockLogger: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
  });

  it('should delete user successfully', async () => {
    // Arrange
    const { toDomainUser } = await import('../../impl/userTransformer');
    
    // Mock fetch user chain
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      }),
    });
    
    // Mock update user chain
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      }),
    });
    
    vi.mocked(toDomainUser).mockReturnValue(mockUser);

    // Act
    const result = await deleteUser(mockUser.id);

    // Assert
    expect(result).toEqual(mockUser);
  });

  it('should return null if user not found', async () => {
    // Arrange
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      }),
    });

    // Act
    const result = await deleteUser('non-existent-id');

    // Assert
    expect(result).toBeNull();
  });

  it('should handle errors', async () => {
    // Arrange
    const error = new Error('Database error');
    
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    });

    // Act & Assert
    await expect(deleteUser('test-id')).rejects.toThrow('Database error');
  });
});