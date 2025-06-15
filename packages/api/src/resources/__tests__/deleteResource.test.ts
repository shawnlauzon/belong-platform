import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { deleteResource } from '../impl/deleteResource';
import { AUTH_ERROR_MESSAGES } from '../../auth';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
      }),
    },
  },
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('deleteResource', () => {
  const resourceId = faker.string.uuid();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the fetch for existing resource
    (supabase.from('').select().eq().single as any).mockResolvedValue({
      data: { owner_id: 'user-123' }, // Mock that the current user is the owner
      error: null,
    });
    
    // Mock the delete response
    (supabase.from('').delete as any).mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: null,
      }),
    });
  });

  it('should delete an existing resource', async () => {
    // Act
    await deleteResource(resourceId);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    
    // Verify we check the existing resource
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').select).toHaveBeenCalledWith('owner_id');
    expect(supabase.from('').eq).toHaveBeenCalledWith('id', resourceId);
    
    // Verify the delete
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').delete).toHaveBeenCalled();
    expect(supabase.from('').eq).toHaveBeenCalledWith('id', resourceId);
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(
      AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED
    );
  });

  it('should throw an error when user is not the owner', async () => {
    // Arrange - Mock that the resource is owned by a different user
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: { owner_id: 'different-user' },
      error: null,
    });

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(
      'You are not authorized to delete this resource'
    );
  });

  it('should not throw an error when resource does not exist', async () => {
    // Arrange
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }, // Not found error code
    });

    // Act
    await expect(deleteResource('non-existent-id')).resolves.not.toThrow();
    
    // Verify we logged a warning
    expect(supabase.logger.warn).toHaveBeenCalledWith(
      '📚 API: Resource not found for deletion',
      { id: 'non-existent-id' }
    );
  });

  it('should throw an error when delete fails', async () => {
    // Arrange
    const mockError = new Error('Failed to delete resource');
    (supabase.from('').delete as any).mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(mockError);
  });
});
