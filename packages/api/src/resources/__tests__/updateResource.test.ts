import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { updateResource } from '../impl/updateResource';
import { createMockDbResource } from './test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
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
      getUser: vi.fn(),
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
  const authenticatedUserId = faker.string.uuid();
  const mockUser = createMockUser({ id: authenticatedUserId });
  const mockCommunity = createMockCommunity();
  
  const updatedTitle = faker.commerce.productName();
  const updatedDescription = faker.lorem.paragraph();
  
  const mockUpdateData = {
    id: resourceId,
    title: updatedTitle,
    description: updatedDescription,
  };

  const mockUpdatedResource = {
    ...createMockDbResource({
      id: resourceId,
      title: updatedTitle,
      description: updatedDescription,
      owner_id: authenticatedUserId,
      community_id: mockCommunity.id,
    }),
    owner: mockUser,
    community: mockCommunity,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock supabase.auth.getUser to return the authenticated user (default)
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: authenticatedUserId } },
      error: null,
    });
  });

  it('should update an existing resource', async () => {
    // Arrange - Mock successful fetch and update
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: {
        ...createMockDbResource({ owner_id: authenticatedUserId, community_id: mockCommunity.id }),
        owner: mockUser,
        community: mockCommunity,
      },
      error: null,
    });
    
    (supabase.from('').update as any).mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockUpdatedResource,
        error: null,
      }),
    });

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
        title: updatedTitle,
        description: updatedDescription,
      })
    );
    
    expect(result).toMatchObject({
      id: resourceId,
      title: updatedTitle,
      owner: expect.objectContaining({ id: authenticatedUserId }),
    });
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
    const differentOwnerId = faker.string.uuid();
    const differentOwner = createMockUser({ id: differentOwnerId });
    
    (supabase.from('').select().eq().single as any).mockResolvedValueOnce({
      data: {
        ...createMockDbResource({ owner_id: differentOwnerId, community_id: mockCommunity.id }),
        owner: differentOwner,
        community: mockCommunity,
      },
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
    const mockError = new Error('Database error');
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
