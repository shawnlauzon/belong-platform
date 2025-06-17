import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteThanks } from '../impl/deleteThanks';
import { createMockDbThanks } from './test-utils';
import { createMockUser, createMockResource } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('deleteThanks', () => {
  const mockFromUser = createMockUser({ id: 'user-123' });
  const mockToUser = createMockUser({ id: 'user-456' });
  const mockResource = createMockResource({ id: 'resource-789' });
  
  const mockThanks = createMockDbThanks({
    id: 'thanks-1',
    from_user_id: 'user-123',
    to_user_id: 'user-456',
    resource_id: 'resource-789',
    message: 'Thank you!',
  });

  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const mocks = setupBelongClientMocks();
    mockSupabase = mocks.mockSupabase;
    mockLogger = mocks.mockLogger;
    
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
    });
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(mockResource);
  });

  it('should delete thanks successfully', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Mock the select and delete queries
    const mockQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockThanks,
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await deleteThanks('thanks-1');

    // Assert
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
    expect(result).toMatchObject({
      id: 'thanks-1',
      message: 'Thank you!',
      fromUser: expect.objectContaining({ id: 'user-123' }),
      toUser: expect.objectContaining({ id: 'user-456' }),
      resource: expect.objectContaining({ id: 'resource-789' }),
    });
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should return null when thanks not found', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await deleteThanks('nonexistent-id');

    // Assert
    expect(result).toBeNull();
  });

  it.skip('should throw an error when user is not the creator', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-456' } }, // Different user
    });
    
    const mockThanksWithDifferentCreator = {
      ...mockThanks,
      from_user_id: 'user-123', // Original creator
    };
    
    mockSupabase.from('').select.mockResolvedValue({
      data: mockThanksWithDifferentCreator,
      error: null,
    });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow(
      'You are not authorized to delete this thanks'
    );
  });

  it.skip('should throw an error when delete operation fails', async () => {
    // Arrange
    const mockError = new Error('Delete failed');
    mockSupabase.from('').delete.mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow(mockError);
  });

  it.skip('should throw an error when from user is not found', async () => {
    // Arrange
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(null); // From user not found
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow('Failed to load thanks dependencies');
  });

  it.skip('should throw an error when to user is not found', async () => {
    // Arrange
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(null); // To user not found
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow('Failed to load thanks dependencies');
  });

  it.skip('should throw an error when resource is not found', async () => {
    // Arrange
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow('Failed to load thanks dependencies');
  });

  it.skip('should handle fetch error that is not "not found"', async () => {
    // Arrange
    const mockError = { code: 'SOME_ERROR', message: 'Database error' };
    mockSupabase.from('').select.mockResolvedValue({
      data: null,
      error: mockError,
    });

    // Act & Assert
    await expect(deleteThanks('thanks-1')).rejects.toThrow();
  });
});