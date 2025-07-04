import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createUserService } from '../user.service';

// Mock the logger
vi.mock('../../../../shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('User Search Functionality (Database Schema Fix)', () => {
  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    is: vi.fn(() => mockSupabase),
    or: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    range: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
  };

  let userService: ReturnType<typeof createUserService>;

  beforeEach(() => {
    vi.clearAllMocks();
    userService = createUserService(mockSupabase as any);
  });

  test('should use correct JSON path operators for searching user metadata', async () => {
    // Arrange: Mock successful query response
    const mockUsers = [
      {
        id: 'user-1',
        email: 'john@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_metadata: {
          first_name: 'John',
          last_name: 'Doe',
        },
      },
    ];

    // Mock the final query result  
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.is.mockReturnValue(mockSupabase);
    const mockQuery = mockSupabase.or.mockResolvedValue({
      data: mockUsers,
      error: null,
    });

    // Act: Search for users with a search term
    await userService.fetchUsers({ searchTerm: 'John' });

    // Assert: Should use JSON path operators instead of direct column names
    expect(mockSupabase.or).toHaveBeenCalledWith(
      `email.ilike.%John%,user_metadata->>'first_name'.ilike.%John%,user_metadata->>'last_name'.ilike.%John%`
    );
  });

  test('should handle search with email, first name, and last name using proper JSON syntax', async () => {
    // Arrange: Mock successful query response
    // Mock the final query result
    mockSupabase.order.mockReturnValue(mockSupabase);
    mockSupabase.is.mockReturnValue(mockSupabase);
    mockSupabase.or.mockResolvedValue({
      data: [],
      error: null,
    });

    // Act: Search for users
    await userService.fetchUsers({ searchTerm: 'test' });

    // Assert: Should construct proper search query with JSON operators
    expect(mockSupabase.or).toHaveBeenCalledWith(
      `email.ilike.%test%,user_metadata->>'first_name'.ilike.%test%,user_metadata->>'last_name'.ilike.%test%`
    );
  });

  test('should handle users without metadata gracefully', async () => {
    // Arrange: Mock users with missing or empty metadata
    const mockUsers = [
      {
        id: 'user-1',
        email: 'user@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_metadata: null, // Missing metadata
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        user_metadata: {}, // Empty metadata
      },
    ];

    // Mock the query result (no search term, so no .or() call)
    mockSupabase.order.mockResolvedValue({
      data: mockUsers,
      error: null,
    });

    // Act: Fetch users and transform them
    const result = await userService.fetchUsers();

    // Assert: Should handle missing metadata gracefully
    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe(''); // Should default to empty string
    expect(result[1].firstName).toBe(''); // Should default to empty string
  });
});