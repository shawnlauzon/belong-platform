import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUsers } from '../../impl/fetchUsers';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        ilike: vi.fn(() => ({
          range: vi.fn(),
        })),
        range: vi.fn(),
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
}));

describe('fetchUsers', () => {
  const mockUser1 = createMockUser();
  const mockUser2 = createMockUser();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch users successfully', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    const { toDomainUser } = await import('../../impl/userTransformer');
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: [mockUser1, mockUser2],
        error: null,
        count: 2,
      }),
    };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });
    
    vi.mocked(toDomainUser)
      .mockReturnValueOnce(mockUser1)
      .mockReturnValueOnce(mockUser2);

    // Act
    const result = await fetchUsers({});

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(mockUser1);
    expect(result[1]).toEqual(mockUser2);
  });

  it('should handle empty results', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    // Act
    const result = await fetchUsers({});

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should handle errors', async () => {
    // Arrange
    const { supabase } = await import('@belongnetwork/core');
    const error = new Error('Database error');
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: null,
        error,
        count: 0,
      }),
    };
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    // Act & Assert
    await expect(fetchUsers({})).rejects.toThrow('Database error');
  });
});