import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchUsers } from '../../impl/fetchUsers';
import { createMockDbProfile, createMockUser } from '../../../test-utils/mocks';
import type { Database, User } from '@belongnetwork/types';
import { toDomainUser } from '../../impl/userTransformer';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Mock the supabase client
const mockFrom = vi.fn();

// Mock logger
const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: mockFrom,
  },
  logger: mockLogger,
}));

// Import after setting up mocks
const { supabase } = await import('@belongnetwork/core');

// Helper function to set up the mock response
const setupMockResponse = (data: Profile[] = [], error: Error | null = null, count: number | null = null) => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValueOnce({
      data,
      error,
      count: count ?? data.length,
    }),
  };
  
  mockFrom.mockReturnValueOnce(mockQuery);
  return mockQuery;
};

// Helper to create a mock user with specific properties
const createTestUser = (overrides: Partial<User> = {}) => {
  const mockUser = createMockUser(overrides);
  return {
    domain: mockUser,
    db: {
      id: mockUser.id,
      email: mockUser.email,
      user_metadata: {
        first_name: mockUser.firstName,
        last_name: mockUser.lastName,
        full_name: mockUser.fullName,
        avatar_url: mockUser.avatarUrl,
        location: mockUser.location,
      },
      created_at: mockUser.createdAt.toISOString(),
      updated_at: mockUser.updatedAt.toISOString(),
    } as Profile,
  };
};

describe('fetchUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch users with default filter', async () => {
    // Arrange
    const testUser1 = createTestUser({ firstName: 'John', lastName: 'Doe' });
    const testUser2 = createTestUser({ firstName: 'Jane', lastName: 'Smith' });
    
    const mockQuery = setupMockResponse([testUser1.db, testUser2.db]);
    
    // Mock the transformer
    vi.mocked(toDomainUser)
      .mockReturnValueOnce(testUser1.domain)
      .mockReturnValueOnce(testUser2.domain);

    // Act
    const result = await fetchUsers({});

    // Assert
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(mockQuery.range).toHaveBeenCalledWith(0, 49); // Default range 0-49
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(testUser1.domain);
    expect(result[1]).toEqual(testUser2.domain);
    
    // Verify the transformer was called for each user
    expect(toDomainUser).toHaveBeenCalledTimes(2);
  });

  it('should apply filters when provided', async () => {
    // Arrange
    const testUser1 = createTestUser({ 
      firstName: 'Test', 
      lastName: 'User',
      email: 'test@example.com' 
    });
    const testUser2 = createTestUser({ 
      firstName: 'Another', 
      lastName: 'Test',
      email: 'another@test.com'
    });
    
    const mockQuery = setupMockResponse([testUser1.db, testUser2.db]);
    
    // Mock the transformer
    vi.mocked(toDomainUser)
      .mockReturnValueOnce(testUser1.domain)
      .mockReturnValueOnce(testUser2.domain);

    const filter = {
      searchTerm: 'test',
      page: 2,
      limit: 10,
    };

    // Act
    const result = await fetchUsers(filter);

    // Assert
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockQuery.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(mockQuery.ilike).toHaveBeenCalledWith('user_metadata->>full_name', '%test%');
    expect(mockQuery.range).toHaveBeenCalledWith(10, 19); // (page-1)*limit to page*limit-1
    expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(testUser1.domain);
    expect(result[1]).toEqual(testUser2.domain);
  });

  it('should handle database errors gracefully', async () => {
    // Arrange
    const error = { 
      name: 'PostgrestError',
      message: 'Database connection error',
      details: 'Connection failed',
      hint: 'Check your database connection',
      code: '08006'
    };
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error,
        count: 0,
      }),
    };
    
    mockFrom.mockReturnValueOnce(mockQuery);

    // Act & Assert
    await expect(fetchUsers({ searchTerm: 'test' })).rejects.toThrow('Database connection error');
    expect(mockLogger.error).toHaveBeenCalledWith('👤 API: Failed to fetch users', { error });
  });

  it('should handle empty responses', async () => {
    // Arrange
    setupMockResponse([]);

    // Act
    const result = await fetchUsers({ searchTerm: 'nonexistent' });

    // Assert
    expect(result).toHaveLength(0);
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: No users found', { 
      filter: { searchTerm: 'nonexistent' } 
    });
  });

  it('should handle pagination with large page numbers', async () => {
    // Arrange
    setupMockResponse([]);

    // Act
    const result = await fetchUsers({ page: 100, limit: 10 });

    // Assert
    expect(result).toHaveLength(0);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
  });

  it('should handle large result sets', async () => {
    // Arrange
    const largeMockUsers = Array(1000).fill(0).map((_, i) => 
      createTestUser({ firstName: `User${i}`, email: `user${i}@example.com` }).db
    );
    
    // Setup mock to return only a subset based on pagination
    const page = 3;
    const limit = 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    const paginatedUsers = largeMockUsers.slice(start, end + 1);
    
    setupMockResponse(paginatedUsers, null, largeMockUsers.length);
    
    // Mock the transformer for all users
    paginatedUsers.forEach((user, i) => {
      vi.mocked(toDomainUser).mockReturnValueOnce(createTestUser().domain);
    });

    // Act
    const result = await fetchUsers({ page, limit });

    // Assert
    expect(result).toHaveLength(paginatedUsers.length);
    expect(mockQuery.range).toHaveBeenCalledWith(start, end);
  });

  it('should handle different search terms', async () => {
    // Arrange
    const testUsers = [
      createTestUser({ firstName: 'Alice', email: 'alice@example.com' }),
      createTestUser({ firstName: 'Bob', email: 'bob@example.com' }),
    ];
    
    const mockQuery = setupMockResponse(testUsers.map(u => u.db));
    
    // Mock the transformer
    testUsers.forEach(user => {
      vi.mocked(toDomainUser).mockReturnValueOnce(user.domain);
    });

    // Act
    await fetchUsers({ searchTerm: 'alice' });

    // Assert
    expect(mockQuery.ilike).toHaveBeenCalledWith('user_metadata->>full_name', '%alice%');
  });

  it('should log debug information', async () => {
    // Arrange
    const testUser = createTestUser();
    setupMockResponse([testUser.db]);
    vi.mocked(toDomainUser).mockReturnValueOnce(testUser.domain);

    // Act
    await fetchUsers({ page: 1, limit: 10 });

    // Assert
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Fetching users', { 
      filter: { page: 1, limit: 10 },
      from: 0,
      to: 9
    });
    
    expect(mockLogger.debug).toHaveBeenCalledWith('👤 API: Successfully fetched users', {
      count: 1,
      total: 1
    });
  });

  it('should handle invalid input parameters', async () => {
    // Arrange
    setupMockResponse([]);

    // Act & Assert
    await expect(fetchUsers({ page: -1, limit: 1000 } as any)).resolves.toHaveLength(0);
    await expect(fetchUsers({ page: 0, limit: 0 } as any)).resolves.toHaveLength(0);
  });
});
