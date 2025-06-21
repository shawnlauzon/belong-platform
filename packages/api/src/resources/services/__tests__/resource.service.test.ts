import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createResourceService } from '../resource.service';
import { logger } from '@belongnetwork/core';
import type { ResourceData, ResourceFilter } from '@belongnetwork/types';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../../constants';

// Mock the logger
vi.mock('@belongnetwork/core', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the transformers
vi.mock('../../impl/resourceTransformer', () => ({
  toResourceInfo: vi.fn(),
  toDomainResource: vi.fn(),
  forDbInsert: vi.fn(),
  forDbUpdate: vi.fn(),
}));

// Mock the other services
vi.mock('../../../users/services/user.service', () => ({
  createUserService: vi.fn(),
}));

vi.mock('../../../communities/services/community.service', () => ({
  createCommunityService: vi.fn(),
}));

import { toResourceInfo, toDomainResource, forDbInsert, forDbUpdate } from '../../impl/resourceTransformer';
import { createUserService } from '../../../users/services/user.service';
import { createCommunityService } from '../../../communities/services/community.service';

const mockLogger = vi.mocked(logger);
const mockToResourceInfo = vi.mocked(toResourceInfo);
const mockToDomainResource = vi.mocked(toDomainResource);
const mockForDbInsert = vi.mocked(forDbInsert);
const mockForDbUpdate = vi.mocked(forDbUpdate);
const mockCreateUserService = vi.mocked(createUserService);
const mockCreateCommunityService = vi.mocked(createCommunityService);

describe('ResourceService', () => {
  let mockSupabase: any;
  let resourceService: ReturnType<typeof createResourceService>;

  const mockDbResource = {
    id: 'resource-123',
    title: 'Test Resource',
    description: 'Test Description',
    category: 'tools',
    type: 'borrow',
    owner_id: 'user-123',
    community_id: 'community-123',
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockResourceInfo = {
    id: 'resource-123',
    title: 'Test Resource',
    description: 'Test Description',
    category: 'tools',
    type: 'borrow',
    ownerId: 'user-123',
    communityId: 'community-123',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCommunity = {
    id: 'community-123',
    name: 'Test Community',
    description: 'Test Description',
    level: 'city' as const,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockResource = {
    id: 'resource-123',
    title: 'Test Resource',
    description: 'Test Description',
    category: 'tools',
    type: 'borrow',
    owner: mockUser,
    community: mockCommunity,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    };

    resourceService = createResourceService(mockSupabase);

    // Setup default transformer mocks
    mockToResourceInfo.mockReturnValue(mockResourceInfo);
    mockToDomainResource.mockReturnValue(mockResource);
    mockForDbInsert.mockReturnValue(mockDbResource);
    mockForDbUpdate.mockReturnValue(mockDbResource);

    // Setup service mocks
    const mockUserService = {
      fetchUserById: vi.fn().mockResolvedValue(mockUser),
    };
    const mockCommunityService = {
      fetchCommunityById: vi.fn().mockResolvedValue(mockCommunity),
    };
    mockCreateUserService.mockReturnValue(mockUserService as any);
    mockCreateCommunityService.mockReturnValue(mockCommunityService as any);
  });

  describe('fetchResources', () => {
    it('should fetch resources successfully', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResources();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockToResourceInfo).toHaveBeenCalledWith(mockDbResource, 0, [mockDbResource]);
      expect(result).toEqual([mockResourceInfo]);
      expect(mockLogger.debug).toHaveBeenCalledWith('📚 API: Fetching resources', { filters: undefined });
    });

    it('should apply community filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ResourceFilter = { communityId: 'community-123' };

      // Act
      const result = await resourceService.fetchResources(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('community_id', 'community-123');
      expect(result).toEqual([mockResourceInfo]);
    });

    it('should apply category filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ResourceFilter = { category: 'tools' };

      // Act
      const result = await resourceService.fetchResources(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'tools');
      expect(result).toEqual([mockResourceInfo]);
    });

    it('should apply type filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ResourceFilter = { type: 'borrow' };

      // Act
      const result = await resourceService.fetchResources(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('type', 'borrow');
      expect(result).toEqual([mockResourceInfo]);
    });

    it('should apply owner filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ResourceFilter = { ownerId: 'user-123' };

      // Act
      const result = await resourceService.fetchResources(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('owner_id', 'user-123');
      expect(result).toEqual([mockResourceInfo]);
    });

    it('should apply isActive filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbResource], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ResourceFilter = { isActive: true };

      // Act
      const result = await resourceService.fetchResources(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toEqual([mockResourceInfo]);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockQueryResult = { data: [], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResources();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResources();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(resourceService.fetchResources()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('📚 API: Failed to fetch resources', { error: dbError });
    });
  });

  describe('fetchResourceById', () => {
    it('should fetch resource by ID successfully', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbResource, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResourceById('resource-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'resource-123');
      expect(mockCreateUserService).toHaveBeenCalledWith(mockSupabase);
      expect(mockCreateCommunityService).toHaveBeenCalledWith(mockSupabase);
      expect(mockToDomainResource).toHaveBeenCalledWith(mockDbResource, mockUser, mockCommunity);
      expect(result).toEqual(mockResource);
    });

    it('should return null when resource not found', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: { code: 'PGRST116' } };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResourceById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle resource without community', async () => {
      // Arrange
      const resourceWithoutCommunity = { ...mockDbResource, community_id: null };
      const mockQueryResult = { data: resourceWithoutCommunity, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.fetchResourceById('resource-123');

      // Assert
      expect(mockToDomainResource).toHaveBeenCalledWith(resourceWithoutCommunity, mockUser, undefined);
      expect(result).toEqual(mockResource);
    });

    it('should throw error when owner not found', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbResource, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const mockUserService = {
        fetchUserById: vi.fn().mockResolvedValue(null),
      };
      mockCreateUserService.mockReturnValue(mockUserService as any);

      // Act & Assert
      await expect(resourceService.fetchResourceById('resource-123')).rejects.toThrow('Owner not found');
    });

    it('should throw database errors other than not found', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(resourceService.fetchResourceById('resource-123')).rejects.toThrow(dbError);
    });
  });

  describe('createResource', () => {
    const mockResourceData: ResourceData = {
      title: 'New Resource',
      description: 'A new resource',
      category: 'tools',
      type: 'borrow',
      communityId: 'community-123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should create resource successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsertResult = { data: mockDbResource, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.createResource(mockResourceData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbInsert).toHaveBeenCalledWith(mockResourceData, 'user-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockQuery.insert).toHaveBeenCalledWith([mockDbResource]);
      expect(mockToDomainResource).toHaveBeenCalledWith(mockDbResource, expect.any(Object), expect.any(Object));
      expect(result).toEqual(mockResource);
      expect(mockLogger.info).toHaveBeenCalledWith('📚 API: Successfully created resource', {
        id: mockResource.id,
        title: mockResource.title,
        ownerId: mockResource.owner.id,
        communityId: mockResource.community?.id,
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(resourceService.createResource(mockResourceData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Insert failed');
      const mockInsertResult = { data: null, error: dbError };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(resourceService.createResource(mockResourceData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('📚 API: Failed to create resource', { error: dbError });
    });

    it('should throw error when owner not found after creation', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsertResult = { data: mockDbResource, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const mockUserService = {
        fetchUserById: vi.fn().mockResolvedValue(null),
      };
      mockCreateUserService.mockReturnValue(mockUserService as any);

      // Act & Assert
      await expect(resourceService.createResource(mockResourceData)).rejects.toThrow('Owner not found');
    });
  });

  describe('updateResource', () => {
    const mockUpdateData = {
      title: 'Updated Resource',
      description: 'Updated description',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should update resource successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateResult = { data: mockDbResource, error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await resourceService.updateResource('resource-123', mockUpdateData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'resource-123');
      expect(mockToDomainResource).toHaveBeenCalledWith(mockDbResource, expect.any(Object), expect.any(Object));
      expect(result).toEqual(mockResource);
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(resourceService.updateResource('resource-123', mockUpdateData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Update failed');
      const mockUpdateResult = { data: null, error: dbError };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(resourceService.updateResource('resource-123', mockUpdateData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('📚 API: Failed to update resource', { id: 'resource-123', error: dbError });
    });
  });

  describe('deleteResource', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should soft delete resource successfully when user is owner', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the fetch query for ownership check
      const mockFetchResult = { data: { owner_id: 'user-123', community_id: 'community-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      // Mock the update query for soft delete
      const mockUpdateResult = { error: null };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFetchQuery) // First call for ownership check
        .mockReturnValueOnce(mockUpdateQuery); // Second call for update

      // Act
      const result = await resourceService.deleteResource('resource-123');

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockFetchQuery.select).toHaveBeenCalledWith('owner_id, community_id');
      expect(mockFetchQuery.eq).toHaveBeenCalledWith('id', 'resource-123');
      expect(mockUpdateQuery.update).toHaveBeenCalledWith({
        is_active: false,
        updated_at: expect.any(String),
      });
      expect(mockUpdateQuery.eq).toHaveBeenCalledWith('id', 'resource-123');
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('📚 Resource Service: Successfully deleted resource', {
        id: 'resource-123',
      });
    });

    it('should return early when resource not found', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: null, error: { code: 'PGRST116' } };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act
      const result = await resourceService.deleteResource('nonexistent-resource');

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('📚 Resource Service: Resource not found for deletion', {
        id: 'nonexistent-resource',
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(resourceService.deleteResource('resource-123')).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when user is not the owner', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: { owner_id: 'other-user', community_id: 'community-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act & Assert
      await expect(resourceService.deleteResource('resource-123')).rejects.toThrow('You are not authorized to delete this resource');
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: { owner_id: 'user-123', community_id: 'community-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      const dbError = new Error('Update failed');
      const mockUpdateResult = { error: dbError };
      const mockUpdateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockUpdateQuery);

      // Act & Assert
      await expect(resourceService.deleteResource('resource-123')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('📚 Resource Service: Failed to delete resource', {
        id: 'resource-123',
        error: dbError.message,
        code: undefined,
      });
    });
  });
});