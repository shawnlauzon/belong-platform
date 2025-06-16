import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { updateResource } from '../impl/updateResource';
import { createMockDbResource } from './test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

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
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
  });

  it('should update an existing resource', async () => {
    // Arrange - Mock successful ownership check
    const mockQuery1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: authenticatedUserId },
        error: null,
      }),
    };
    
    // Mock successful update
    const mockQuery2 = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: createMockDbResource({
          id: resourceId,
          title: updatedTitle,
          description: updatedDescription,
          owner_id: authenticatedUserId,
          community_id: mockCommunity.id,
        }),
        error: null,
      }),
    };
    
    vi.mocked(supabase.from).mockReturnValueOnce(mockQuery1 as any).mockReturnValueOnce(mockQuery2 as any);

    // Act
    const result = await updateResource(mockUpdateData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    
    // Verify we check the existing resource
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(mockQuery1.select).toHaveBeenCalledWith('owner_id');
    expect(mockQuery1.eq).toHaveBeenCalledWith('id', resourceId);
    
    // Verify the update
    expect(mockQuery2.update).toHaveBeenCalledWith(
      expect.objectContaining({
        title: updatedTitle,
        description: updatedDescription,
      })
    );
    expect(mockQuery2.eq).toHaveBeenCalledWith('id', resourceId);
    
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
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when user is not the owner', async () => {
    // Arrange - Mock that the resource is owned by a different user
    const differentOwnerId = faker.string.uuid();
    
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: differentOwnerId },
        error: null,
      }),
    };
    
    vi.mocked(supabase.from).mockReturnValueOnce(mockQuery as any);

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow(
      'You are not authorized to update this resource'
    );
  });

  it('should throw an error when resource does not exist', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found error code
      }),
    };
    
    vi.mocked(supabase.from).mockReturnValueOnce(mockQuery as any);

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow();
  });

  it('should throw an error when update fails', async () => {
    // Arrange
    const mockError = new Error('Database error');
    
    // Mock successful ownership check
    const mockQuery1 = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { owner_id: authenticatedUserId },
        error: null,
      }),
    };
    
    // Mock failed update
    const mockQuery2 = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    };
    
    vi.mocked(supabase.from).mockReturnValueOnce(mockQuery1 as any).mockReturnValueOnce(mockQuery2 as any);

    // Act & Assert
    await expect(updateResource(mockUpdateData)).rejects.toThrow(mockError);
  });
});
