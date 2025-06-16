import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser } from '../../impl/updateUser';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
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
  forDbUpdate: vi.fn(),
}));

describe('updateUser', () => {
  const mockUser = createMockUser();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update user successfully', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    const { toDomainUser, forDbUpdate } = await import('../../impl/userTransformer');
    
    vi.mocked(forDbUpdate).mockReturnValue({});
    vi.mocked(toDomainUser).mockReturnValue(mockUser);
    
    (supabase.from('').single as any).mockResolvedValue({
      data: mockUser,
      error: null,
    });

    // Act
    const result = await updateUser(mockUser);

    // Assert
    expect(result).toEqual(mockUser);
  });

  it('should handle errors', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    const { forDbUpdate } = await import('../../impl/userTransformer');
    const error = new Error('Update failed');
    
    vi.mocked(forDbUpdate).mockReturnValue({});
    
    (supabase.from('').single as any).mockResolvedValue({
      data: null,
      error,
    });

    // Act & Assert
    await expect(updateUser(mockUser)).rejects.toThrow('Update failed');
  });
});