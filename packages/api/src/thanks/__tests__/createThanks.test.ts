import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createThanks } from '../impl/createThanks';
import { createMockDbThanks, createMockThanksData } from './test-utils';
import { createMockUser, createMockResource } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

import { getBelongClient } from '@belongnetwork/core';
const mockGetBelongClient = vi.mocked(getBelongClient);

describe('createThanks', () => {
  let mockSupabase: any;
  let mockLogger: any;
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
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
    };

    // Setup mock to return our mock client
    mockGetBelongClient.mockReturnValue({
      supabase: mockSupabase,
      logger: mockLogger,
      mapbox: {} as any,
    });
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(mockResource);
    
    // Reset the mock implementation for each test
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedThanks,
          error: null,
        }),
      }),
    });
  });

  it('should create a new thanks', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Act
    const result = await createThanks(mockThanksData);

    // Assert
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
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
    mockSupabase.auth.getUser.mockResolvedValueOnce({
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
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
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

  it('should throw an error when user tries to thank themselves', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    const selfThanksData = createMockThanksData({
      toUserId: 'user-123', // Same as the authenticated user
      resourceId: mockResource.id,
      message: 'Trying to thank myself',
    });

    // Act & Assert
    await expect(createThanks(selfThanksData)).rejects.toThrow('Cannot thank yourself');
  });
});