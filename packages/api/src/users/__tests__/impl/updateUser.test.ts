import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUser } from '../../impl/updateUser';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
    })),
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
    
    const mockQuery = {
      single: vi.fn().mockResolvedValue({
        data: mockUser,
        error: null,
      }),
    };
    (supabase.from as any).mockReturnValue({
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
    const { supabase } = await import('@belongnetwork/core');
    const { forDbUpdate } = await import('../../impl/userTransformer');
    const error = new Error('Update failed');
    
    vi.mocked(forDbUpdate).mockReturnValue({});
    
    const mockQuery = {
      single: vi.fn().mockResolvedValue({
        data: null,
        error,
      }),
    };
    (supabase.from as any).mockReturnValue({
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