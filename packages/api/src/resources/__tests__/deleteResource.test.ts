import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { deleteResource } from '../impl/deleteResource';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

import { getBelongClient } from '@belongnetwork/core';
const mockGetBelongClient = vi.mocked(getBelongClient);

describe('deleteResource', () => {
  let mockSupabase: any;
  let mockLogger: any;
  const resourceId = faker.string.uuid();
  const mockUser = createMockUser({ id: 'user-123' });
  const mockCommunity = createMockCommunity();

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
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
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
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  it('should delete an existing resource', async () => {
    // Arrange - Mock ownership check
    const mockQuery1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: 'user-123', community_id: mockCommunity.id },
        error: null,
      }),
    };
    
    // Mock update (soft delete)
    const mockQuery2 = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: {
          id: resourceId,
          owner_id: 'user-123',
          community_id: mockCommunity.id,
          is_active: false,
        },
        error: null,
      }),
    };
    
    mockSupabase.from.mockReturnValueOnce(mockQuery1 as any).mockReturnValueOnce(mockQuery2 as any);

    // Act
    const result = await deleteResource(resourceId);

    // Assert
    expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    expect(mockQuery1.select).toHaveBeenCalledWith('owner_id, community_id');
    expect(mockQuery1.eq).toHaveBeenCalledWith('id', resourceId);
    expect(mockQuery2.update).toHaveBeenCalledWith({
      is_active: false,
      updated_at: expect.any(String),
    });
    expect(result).toBeUndefined();
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when user is not the owner', async () => {
    // Arrange - Mock that the resource is owned by a different user
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: 'different-user', community_id: mockCommunity.id },
        error: null,
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(
      'You are not authorized to delete this resource'
    );
  });

  it('should not throw an error when resource does not exist', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      }),
    };
    
    mockSupabase.from.mockReturnValue(mockQuery as any);

    // Act
    const result = await deleteResource('non-existent-id');
    
    // Assert
    expect(result).toBeUndefined();
  });

  it('should throw an error when delete fails', async () => {
    // Arrange
    const mockError = new Error('Failed to delete resource');
    
    // Mock successful ownership check
    const mockQuery1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: 'user-123', community_id: mockCommunity.id },
        error: null,
      }),
    };
    
    // Mock failed update
    const mockQuery2 = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    
    mockSupabase.from.mockReturnValueOnce(mockQuery1 as any).mockReturnValueOnce(mockQuery2 as any);

    // Act & Assert
    await expect(deleteResource(resourceId)).rejects.toThrow(mockError);
  });
});
