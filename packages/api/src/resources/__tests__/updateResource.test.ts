import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { updateResource } from '../impl/updateResource';
import { createMockDbResource } from './test-utils';
import { AUTH_ERROR_MESSAGES } from '../../auth';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
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
  },
}));

describe('updateResource', () => {
  const resourceId = faker.string.uuid();
  const mockUpdateData = {
    id: resourceId,
    title: 'Updated Resource Title',
    description: 'Updated description',
  };

  const mockUpdatedResource = createMockDbResource({
    id: resourceId,
    title: 'Updated Resource Title',
    description: 'Updated description',
    owner_id: 'user-123', // Same owner as the authenticated user
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the fetch for existing resource
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: { owner_id: 'user-123' }, // Mock that the current user is the owner
      error: null,
    });
    
    // Mock the update response
    (supabase.from('').update as any).mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUpdatedResource,
        error: null,
      }),
    });
  });

  it('should update an existing resource', async () => {
    // Act
    const result = await updateResource(mockUpdateData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    
    // Verify we check the existing resource
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').select).toHaveBeenCalledWith('owner_id');
    expect(supabase.from('').eq).toHaveBeenCalledWith('id', resourceId);
    
    // Verify the update
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Updated Resource Title',
        description: 'Updated description',
      })
    );
    
    expect(result).toEqual(expect.objectContaining({
      id: resourceId,
      title: 'Updated Resource Title',
      ownerId: 'user-123',
    }));
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow(
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
    await expect(updateResource(mockUpdateData)).rejects.toThrow(
      'You are not authorized to update this resource'
    );
  });

  it('should throw an error when resource does not exist', async () => {
    // Arrange
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' }, // Not found error code
    });

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow(
      'Resource not found'
    );
  });

  it('should throw an error when update fails', async () => {
    // Arrange
    const mockError = new Error('Failed to update resource');
    (supabase.from('').update as any).mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow(mockError);
  });
});
