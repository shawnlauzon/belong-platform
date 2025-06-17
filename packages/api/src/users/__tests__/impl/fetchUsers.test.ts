import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUsers } from '../../impl/fetchUsers';
import { createMockUser } from '../../../test-utils/mocks';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

import { getBelongClient } from '@belongnetwork/core';
const mockGetBelongClient = vi.mocked(getBelongClient);

// Mock the transformer
vi.mock('../../impl/userTransformer', () => ({
  toDomainUser: vi.fn(),
}));

describe('fetchUsers', () => {
  let mockSupabase: any;
  let mockLogger: any;
  const mockUser1 = createMockUser();
  const mockUser2 = createMockUser();
  
  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock logger
    mockLogger = {
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      trace: vi.fn(),
    };

    // Create mock supabase client
    mockSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            range: vi.fn(),
          })),
          range: vi.fn(),
        })),
      })),
    };

    // Setup mock to return our mock client
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
      mapbox: {} as any,
    });
  });

  it('should fetch users successfully', async () => {
    // Arrange
    // Use mockSupabase directly
    const { toDomainUser } = await import('../../impl/userTransformer');
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: [mockUser1, mockUser2],
        error: null,
        count: 2,
      }),
    };
    mockSupabase.from.mockReturnValue({
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
    // Use mockSupabase directly
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    // Act
    const result = await fetchUsers({});

    // Assert
    expect(result).toHaveLength(0);
  });

  it('should handle errors', async () => {
    // Arrange
    // Use mockSupabase directly
    const error = new Error('Database error');
    
    const mockQuery = {
      range: vi.fn().mockResolvedValue({
        data: null,
        error,
        count: 0,
      }),
    };
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue(mockQuery),
    });

    // Act & Assert
    await expect(fetchUsers({})).rejects.toThrow('Database error');
  });
});