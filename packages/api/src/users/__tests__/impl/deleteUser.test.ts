import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteUser } from '../../impl/deleteUser';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock the transformer
vi.mock('../../impl/userTransformer', () => ({
  toDomainUser: vi.fn(),
}));

describe('deleteUser', () => {
  const mockUser = createMockUser();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete user successfully', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    const { toDomainUser } = await import('../../impl/userTransformer');
    
    // Mock fetch user chain
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      }),
    });
    
    // Mock update user chain
    (supabase.from as any).mockReturnValueOnce({
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
    const { supabase } = await import('@belongnetwork/core');
    
    (supabase.from as any).mockReturnValueOnce({
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
    const { supabase } = await import('@belongnetwork/core');
    const error = new Error('Database error');
    
    (supabase.from as any).mockReturnValueOnce({
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