import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser } from '../../impl/updateUser';
import { createMockUser } from '../../../test-utils/mocks';
import { setupBelongClientMocks } from '../../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

// Mock the transformer
vi.mock('../../impl/userTransformer', () => ({
  toDomainUser: vi.fn(),
  forDbUpdate: vi.fn(),
}));

describe('updateUser', () => {
  const mockUser = createMockUser();
  let mockSupabase: any;
  let mockLogger: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
  });

  it('should update user successfully', async () => {
    // Arrange
    const { toDomainUser, forDbUpdate } = await import('../../impl/userTransformer');
    
    vi.mocked(forDbUpdate).mockReturnValue({});
    vi.mocked(toDomainUser).mockReturnValue(mockUser);
    
    const mockQuery = {
      single: vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      }),
    };
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        }),
      }),
    });

    // Act
    const result = await updateUser(mockUser);

    // Assert
    expect(result).toEqual(mockUser);
  });

  it('should handle errors', async () => {
    // Arrange
    const { forDbUpdate } = await import('../../impl/userTransformer');
    const error = new Error('Update failed');
    
    vi.mocked(forDbUpdate).mockReturnValue({});
    
    const mockQuery = {
      single: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    };
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockQuery),
        }),
      }),
    });

    // Act & Assert
    await expect(updateUser(mockUser)).rejects.toThrow('Update failed');
  });
});