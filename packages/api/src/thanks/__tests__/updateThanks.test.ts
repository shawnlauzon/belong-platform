import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateThanks } from '../impl/updateThanks';
import { createMockDbThanks } from './test-utils';
import { createMockUser, createMockResource } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';
import { setupBelongClientMocks } from '../../test-utils/mockSetup';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('updateThanks', () => {
  let mockSupabase: any;
  let mockLogger: any;
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

  it('should update thanks successfully', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);

    // Act
    const result = await updateThanks(updateData);

    // Assert
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
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
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when thanks not found for ownership check', async () => {
    // Arrange
    const mockSelectQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          }),
        }),
      }),
    };

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow();
  });

  it('should throw an error when user is not the creator', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);

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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);

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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);
    
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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);
    
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

    mockSupabase.from.mockReturnValue(mockSelectQuery as any);
    
    // Mock resource fetch to return null
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

    // Act & Assert
    await expect(updateThanks(updateData)).rejects.toThrow('Resource not found');
  });
});