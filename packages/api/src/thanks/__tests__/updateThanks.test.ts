import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@belongnetwork/core';
import { updateThanks } from '../impl/updateThanks';
import { createMockDbThanks } from './test-utils';
import { createMockUser, createMockResource } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
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

describe('updateThanks', () => {
  const mockFromUser = createMockUser({ id: 'user-123' });
  const mockToUser = createMockUser({ id: 'user-456' });
  const mockResource = createMockResource({ id: 'resource-789' });
  
  const mockExistingThanks = createMockDbThanks({
    id: 'thanks-1',
    from_user_id: 'user-123',
    to_user_id: 'user-456',
    resource_id: 'resource-789',
    message: 'Original message',
  });

  const mockUpdatedThanks = {
    ...mockExistingThanks,
    message: 'Updated message',
    impact_description: 'Great impact!',
  };

  const updateData = {
    id: 'thanks-1',
    message: 'Updated message',
    impactDescription: 'Great impact!',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(mockResource);
  });

  it('should update thanks successfully', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Mock the ownership check query
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedThanks,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);

    // Act
    const result = await updateThanks(updateData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('thanks');
    expect(result).toMatchObject({
      id: 'thanks-1',
      message: 'Updated message',
      fromUser: expect.objectContaining({ id: 'user-123' }),
      toUser: expect.objectContaining({ id: 'user-456' }),
      resource: expect.objectContaining({ id: 'resource-789' }),
    });
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when thanks not found for ownership check', async () => {
    // Arrange
    (supabase.from('').select as any).mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'Not found' },
    });

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow();
  });

  it('should throw an error when user is not the creator', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'user-456' } }, // Different user
    });
    
    // Mock the ownership check query to return original creator
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' }, // Original creator
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedThanks,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow(
      'You are not authorized to update this thanks'
    );
  });

  it('should throw an error when update fails', async () => {
    // Arrange
    const mockError = new Error('Update failed');
    
    // Mock successful ownership check but failed update
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' }, // Correct owner
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow(mockError);
  });

  it('should throw an error when from user is not found', async () => {
    // Arrange
    // Mock successful database operations
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedThanks,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);
    
    // Mock fetchUserById to return null for from user
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(null); // From user not found
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow('From user not found');
  });

  it('should throw an error when to user is not found', async () => {
    // Arrange
    // Mock successful database operations
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedThanks,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);
    
    // Mock fetchUserById to return null for to user
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(null); // To user not found
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow('To user not found');
  });

  it('should throw an error when resource is not found', async () => {
    // Arrange
    // Mock successful database operations
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { from_user_id: 'user-123' },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdatedThanks,
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.mocked(supabase.from).mockReturnValue(mockSelectQuery as any);
    
    // Mock resource fetch to return null
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow('Resource not found');
  });
});