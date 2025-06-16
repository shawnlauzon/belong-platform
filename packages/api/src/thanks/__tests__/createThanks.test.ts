import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@belongnetwork/core';
import { createThanks } from '../impl/createThanks';
import { createMockDbThanks, createMockThanksData } from './test-utils';
import { createMockUser, createMockResource } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';

// Mock the supabase client
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
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

describe('createThanks', () => {
  const mockFromUser = createMockUser({ 
    id: 'user-123',
  });
  const mockToUser = createMockUser({
    id: 'user-456',
  });
  const mockResource = createMockResource({
    id: 'resource-789',
  });
  const mockThanksData = createMockThanksData({
    toUserId: mockToUser.id,
    resourceId: mockResource.id,
    message: 'Thank you for sharing!',
  });

  const mockCreatedThanks = createMockDbThanks({
    message: mockThanksData.message,
    from_user_id: 'user-123',
    to_user_id: mockToUser.id,
    resource_id: mockResource.id,
    image_urls: mockThanksData.imageUrls || [],
    impact_description: mockThanksData.impactDescription || null,
  });

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
    
    // Reset the mock implementation for each test
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCreatedThanks,
        error: null,
      }),
    });
  });

  it('should create a new thanks', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Act
    const result = await createThanks(mockThanksData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('thanks');
    expect(supabase.from('').insert).toHaveBeenCalledWith([
      expect.objectContaining({
        message: 'Thank you for sharing!',
        from_user_id: 'user-123',
        to_user_id: mockToUser.id,
        resource_id: mockResource.id,
      }),
    ]);
    expect(result).toMatchObject({
      id: mockCreatedThanks.id,
      message: 'Thank you for sharing!',
      fromUser: expect.objectContaining({
        id: 'user-123',
      }),
      toUser: expect.objectContaining({
        id: 'user-456',
      }),
      resource: expect.objectContaining({
        id: 'resource-789',
      }),
    });
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(createThanks(mockThanksData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when thanks creation fails', async () => {
    // Arrange
    const mockError = new Error('Failed to create thanks');
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(createThanks(mockThanksData)).rejects.toThrow(mockError);
  });

  it('should throw an error when from user is not found', async () => {
    // Arrange
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(null); // From user not found
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(createThanks(mockThanksData)).rejects.toThrow('From user not found');
  });

  it('should throw an error when to user is not found', async () => {
    // Arrange
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(null); // To user not found
        return Promise.resolve(null);
      });

    // Act & Assert
    await expect(createThanks(mockThanksData)).rejects.toThrow('To user not found');
  });

  it('should throw an error when resource is not found', async () => {
    // Arrange
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

    // Act & Assert
    await expect(createThanks(mockThanksData)).rejects.toThrow('Resource not found');
  });
});