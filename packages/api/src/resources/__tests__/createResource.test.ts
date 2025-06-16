import { describe, it, expect, vi, beforeEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { supabase } from '@belongnetwork/core';
import { createResource } from '../impl/createResource';
import { createMockDbResource } from './test-utils';
import { createMockUser, createMockCommunity } from '../../test-utils/mocks';
import { ResourceCategory } from '@belongnetwork/types';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchCommunityById from '../../communities/impl/fetchCommunityById';

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

describe('createResource', () => {
  const mockUser = createMockUser({ 
    id: 'user-123',
  });
  const mockCommunity = createMockCommunity({
    id: 'comm-123',
  });
  const mockResourceData = {
    title: 'Test Resource',
    description: 'Test Description',
    category: ResourceCategory.FOOD,
    type: 'offer' as const,
    communityId: mockCommunity.id,
    isActive: true,
  };

  const mockCreatedResource = createMockDbResource({
    title: mockResourceData.title,
    description: mockResourceData.description,
    category: mockResourceData.category,
    type: mockResourceData.type,
    owner_id: 'user-123',
    community_id: mockCommunity.id,
    is_active: true,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById').mockResolvedValue(mockUser);
    vi.spyOn(fetchCommunityById, 'fetchCommunityById').mockResolvedValue(mockCommunity);
    
    // Reset the mock implementation for each test
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockCreatedResource,
        error: null,
      }),
    });
  });

  it('should create a new resource', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });

    // Act
    const result = await createResource(mockResourceData);

    // Assert
    expect(supabase.auth.getUser).toHaveBeenCalled();
    expect(supabase.from).toHaveBeenCalledWith('resources');
    expect(supabase.from('').insert).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Test Resource',
        description: 'Test Description',
        category: ResourceCategory.FOOD,
        type: 'offer',
        owner_id: 'user-123',
        community_id: mockCommunity.id,
        is_active: true,
      }),
    ]);
    expect(result).toMatchObject({
      id: mockCreatedResource.id,
      title: 'Test Resource',
      owner: expect.objectContaining({
        id: 'user-123',
      }),
      community: expect.objectContaining({
        id: 'comm-123',
      }),
    });
  });

  it('should throw an error when user is not authenticated', async () => {
    // Arrange
    (supabase.auth.getUser as any).mockResolvedValueOnce({
      data: { user: null },
    });

    // Act & Assert
    await expect(createResource(mockResourceData)).rejects.toThrow(
      'User must be authenticated to perform this operation'
    );
  });

  it('should throw an error when resource creation fails', async () => {
    // Arrange
    const mockError = new Error('Failed to create resource');
    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    });

    // Act & Assert
    await expect(createResource(mockResourceData)).rejects.toThrow(mockError);
  });

  it('should include owner and community in the response when available', async () => {
    // Arrange
    const mockResourceWithRelations = {
      ...mockCreatedResource,
      owner: {
        id: 'user-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      },
      community: {
        id: 'comm-123',
        name: 'Test Community',
        slug: 'test-community',
      },
    };

    (supabase.from('').insert as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: mockResourceWithRelations,
        error: null,
      }),
    });

    // Act
    const result = await createResource(mockResourceData);

    // Assert
    expect(result.owner).toMatchObject({
      id: 'user-123',
    });
    expect(result.community).toMatchObject({
      id: 'comm-123',
    });
  });
});
