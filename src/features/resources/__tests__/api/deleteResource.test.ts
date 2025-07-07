import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteResource } from '../../api/deleteResource';
import { createMockSupabase } from '../../../../test-utils';

describe('deleteResource', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase({});
  });

  it('should require authentication', async () => {
    // Arrange
    const resourceId = 'resource-123';
    
    // Mock unauthenticated user (no user returned)
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    // Act & Assert
    await expect(
      deleteResource(mockSupabase, resourceId)
    ).rejects.toThrow('Authentication required');
  });

  it('should delete resource when authenticated', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const mockUser = { id: 'user-123' };
    
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock successful delete
    mockSupabase.from().delete().eq.mockResolvedValue({
      data: null,
      error: null,
    });

    // Act
    await deleteResource(mockSupabase, resourceId);

    // Assert
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
    expect(mockSupabase.from().delete().eq).toHaveBeenCalledWith('id', resourceId);
  });

  it('should handle database errors', async () => {
    // Arrange
    const resourceId = 'resource-123';
    const mockUser = { id: 'user-123' };
    const dbError = { message: 'Database error' };
    
    // Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Mock database error
    mockSupabase.from().delete().eq.mockResolvedValue({
      data: null,
      error: dbError,
    });

    // Act & Assert
    await expect(
      deleteResource(mockSupabase, resourceId)
    ).rejects.toThrow('Database error');
  });
});