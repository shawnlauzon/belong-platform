import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import {
  fetchResources,
  fetchResourceById,
  createResource,
  updateResource,
  deleteResource,
  useResources,
  useResource,
  useCreateResource,
  useUpdateResource,
  useDeleteResource,
} from './resources';
import { createMockResource, createMockDbResource, createMockUser, createMockCommunity } from './test-utils/mocks';
import { ReactQueryWrapper } from './test-utils/test-utils';
import type { ResourceFilter, CreateResourceData, UpdateResourceData } from '@belongnetwork/types';

// Mock dependencies
vi.mock('@belongnetwork/core', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          or: vi.fn(),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            or: vi.fn(),
          })),
          single: vi.fn(),
        })),
        single: vi.fn(),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(),
            })),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(),
        })),
      })),
    })),
  },
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSupabase = vi.mocked(await import('@belongnetwork/core')).supabase;
const mockLogger = vi.mocked(await import('@belongnetwork/core')).logger;

describe('Resource Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('fetchResources', () => {
    it('should successfully fetch resources', async () => {
      // Arrange
      const mockDbResources = Array.from({ length: 3 }, () =>
        createMockDbResource({
          owner: {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            user_metadata: {
              first_name: faker.person.firstName(),
              last_name: faker.person.lastName(),
              full_name: faker.person.fullName(),
            },
            created_at: faker.date.recent().toISOString(),
            updated_at: faker.date.recent().toISOString(),
          },
          community: {
            id: faker.string.uuid(),
            name: faker.location.city(),
            description: faker.lorem.sentence(),
            member_count: faker.number.int({ min: 10, max: 100 }),
            created_at: faker.date.recent().toISOString(),
            updated_at: faker.date.recent().toISOString(),
          },
        })
      );

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockDbResources,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchResources();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        community_id: expect.any(String),
        owner: expect.objectContaining({
          id: expect.any(String),
          email: expect.any(String),
        }),
        community: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '📦 API: Successfully fetched resources',
        { count: 3 }
      );
    });

    it('should handle database errors', async () => {
      // Arrange
      const dbError = new Error('Database connection failed');
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchResources()).rejects.toThrow('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '📦 API: Failed to fetch resources',
        { error: dbError }
      );
    });
  });

  describe('fetchResourceById', () => {
    it('should successfully fetch a resource by ID', async () => {
      // Arrange
      const mockDbResource = createMockDbResource({
        owner: {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          user_metadata: {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
          },
          created_at: faker.date.recent().toISOString(),
          updated_at: faker.date.recent().toISOString(),
        },
        community: {
          id: faker.string.uuid(),
          name: faker.location.city(),
          description: faker.lorem.sentence(),
          member_count: faker.number.int({ min: 10, max: 100 }),
          created_at: faker.date.recent().toISOString(),
          updated_at: faker.date.recent().toISOString(),
        },
      });
      const resourceId = mockDbResource.id;

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbResource,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchResourceById(resourceId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toMatchObject({
        id: resourceId,
        title: mockDbResource.title,
        community_id: expect.any(String),
        community: expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
        }),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '📦 API: Successfully fetched resource',
        { id: resourceId, title: result?.title }
      );
    });

    it('should return null when resource is not found', async () => {
      // Arrange
      const resourceId = faker.string.uuid();
      const notFoundError = { code: 'PGRST116' };

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: notFoundError,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await fetchResourceById(resourceId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      // Arrange
      const resourceId = faker.string.uuid();
      const dbError = new Error('Database query failed');

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: dbError,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(fetchResourceById(resourceId)).rejects.toThrow('Database query failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '📦 API: Error fetching resource by ID',
        { id: resourceId, error: dbError }
      );
    });
  });

  describe('createResource', () => {
    it('should successfully create a resource', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockCommunity = createMockCommunity();
      const createData: CreateResourceData = {
        type: 'offer',
        category: 'tools' as any,
        title: 'Power Drill',
        description: 'High-quality power drill for rent',
        community_id: mockCommunity.id,
        image_urls: ['https://example.com/drill.jpg'],
        location: { lat: 40.7128, lng: -74.006 },
        meetup_flexibility: 'home_only' as any,
        is_active: true,
      };

      const mockDbResource = createMockDbResource({
        ...createData,
        creator_id: mockUser.id,
        community_id: mockCommunity.id,
        owner: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
        community: {
          id: mockCommunity.id,
          name: mockCommunity.name,
          description: mockCommunity.description,
          member_count: mockCommunity.member_count,
          created_at: mockCommunity.created_at.toISOString(),
          updated_at: mockCommunity.updated_at.toISOString(),
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbResource,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await createResource(createData);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toMatchObject({
        title: createData.title,
        description: createData.description,
        type: createData.type,
        community_id: createData.community_id,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Successfully created resource',
        { id: result.id, title: result.title }
      );
    });

    it('should require authentication to create resource', async () => {
      // Arrange
      const createData: CreateResourceData = {
        type: 'offer',
        category: 'tools' as any,
        title: 'Power Drill',
        description: 'High-quality power drill for rent',
        community_id: faker.string.uuid(),
        is_active: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(createResource(createData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });

    it('should handle creation errors', async () => {
      // Arrange
      const mockUser = createMockUser();
      const createData: CreateResourceData = {
        type: 'offer',
        category: 'tools' as any,
        title: 'Power Drill',
        description: 'High-quality power drill for rent',
        community_id: faker.string.uuid(),
        is_active: true,
      };
      const createError = new Error('Creation failed');

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: createError,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(createResource(createData)).rejects.toThrow('Creation failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        '📦 API: Failed to create resource',
        { error: createError }
      );
    });
  });

  describe('updateResource', () => {
    it('should successfully update a resource', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockCommunity = createMockCommunity();
      const updateData: UpdateResourceData = {
        id: faker.string.uuid(),
        title: 'Updated Power Drill',
        description: 'Updated description',
        community_id: mockCommunity.id,
      };

      const mockDbResource = createMockDbResource({
        id: updateData.id,
        title: updateData.title,
        description: updateData.description,
        creator_id: mockUser.id,
        community_id: mockCommunity.id,
        owner: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
        community: {
          id: mockCommunity.id,
          name: mockCommunity.name,
          description: mockCommunity.description,
          member_count: mockCommunity.member_count,
          created_at: mockCommunity.created_at.toISOString(),
          updated_at: mockCommunity.updated_at.toISOString(),
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockDbResource,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await updateResource(updateData);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(result).toMatchObject({
        id: updateData.id,
        title: updateData.title,
        description: updateData.description,
        community_id: updateData.community_id,
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Successfully updated resource',
        { id: result.id, title: result.title }
      );
    });

    it('should require authentication to update resource', async () => {
      // Arrange
      const updateData: UpdateResourceData = {
        id: faker.string.uuid(),
        title: 'Updated Power Drill',
        community_id: faker.string.uuid(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(updateResource(updateData)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });

  describe('deleteResource', () => {
    it('should successfully delete a resource', async () => {
      // Arrange
      const mockUser = createMockUser();
      const resourceId = faker.string.uuid();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await deleteResource(resourceId);

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('resources');
      expect(mockQuery.delete().eq().eq).toHaveBeenCalledWith('creator_id', mockUser.id);
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Successfully deleted resource',
        { id: resourceId }
      );
    });

    it('should require authentication to delete resource', async () => {
      // Arrange
      const resourceId = faker.string.uuid();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(deleteResource(resourceId)).rejects.toThrow(
        'User must be authenticated to perform this operation'
      );
    });
  });
});

describe('Resource Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('useResources', () => {
    it('should fetch resources successfully', async () => {
      // Arrange
      const mockDbResources = Array.from({ length: 2 }, () =>
        createMockDbResource({
          owner: {
            id: faker.string.uuid(),
            email: faker.internet.email(),
            user_metadata: {
              first_name: faker.person.firstName(),
              last_name: faker.person.lastName(),
            },
            created_at: faker.date.recent().toISOString(),
            updated_at: faker.date.recent().toISOString(),
          },
          community: {
            id: faker.string.uuid(),
            name: faker.location.city(),
            description: faker.lorem.sentence(),
            member_count: faker.number.int({ min: 10, max: 100 }),
            created_at: faker.date.recent().toISOString(),
            updated_at: faker.date.recent().toISOString(),
          },
        })
      );

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockDbResources,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useResources(), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toHaveLength(2);
    });

    it('should handle filters', async () => {
      // Arrange
      const filters: ResourceFilter = { category: 'tools', type: 'offer' };
      const mockDbResources = [createMockDbResource({ category: 'tools', type: 'offer' })];

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: mockDbResources,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useResources(filters), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toHaveLength(1);
    });
  });

  describe('useResource', () => {
    it('should fetch single resource successfully', async () => {
      // Arrange
      const mockDbResource = createMockDbResource({
        owner: {
          id: faker.string.uuid(),
          email: faker.internet.email(),
          user_metadata: {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
          },
          created_at: faker.date.recent().toISOString(),
          updated_at: faker.date.recent().toISOString(),
        },
        community: {
          id: faker.string.uuid(),
          name: faker.location.city(),
          description: faker.lorem.sentence(),
          member_count: faker.number.int({ min: 10, max: 100 }),
          created_at: faker.date.recent().toISOString(),
          updated_at: faker.date.recent().toISOString(),
        },
      });
      const resourceId = mockDbResource.id;

      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbResource,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useResource(resourceId), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(result.current.data).toMatchObject({
        id: resourceId,
        title: mockDbResource.title,
        community_id: expect.any(String),
      });
    });

    it('should not fetch when id is empty', () => {
      // Act
      const { result } = renderHook(() => useResource(''), {
        wrapper: ReactQueryWrapper,
      });

      // Assert
      expect(result.current.isPending).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  describe('useCreateResource', () => {
    it('should create resource and invalidate cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockCommunity = createMockCommunity();
      const createData: CreateResourceData = {
        type: 'offer',
        category: 'tools' as any,
        title: 'Power Drill',
        description: 'High-quality power drill for rent',
        community_id: mockCommunity.id,
        is_active: true,
      };

      const mockDbResource = createMockDbResource({
        ...createData,
        creator_id: mockUser.id,
        community_id: mockCommunity.id,
        owner: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
        community: {
          id: mockCommunity.id,
          name: mockCommunity.name,
          description: mockCommunity.description,
          member_count: mockCommunity.member_count,
          created_at: mockCommunity.created_at.toISOString(),
          updated_at: mockCommunity.updated_at.toISOString(),
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockDbResource,
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useCreateResource(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(createData);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Resource created successfully',
        { id: expect.any(String) }
      );
    });

    it('should handle creation errors', async () => {
      // Arrange
      const createData: CreateResourceData = {
        type: 'offer',
        category: 'tools' as any,
        title: 'Power Drill',
        description: 'High-quality power drill for rent',
        community_id: faker.string.uuid(),
        is_active: true,
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act
      const { result } = renderHook(() => useCreateResource(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(createData);

      // Assert
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '📦 API: Failed to create resource',
        { error: expect.any(Error) }
      );
    });
  });

  describe('useUpdateResource', () => {
    it('should update resource and invalidate cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const mockCommunity = createMockCommunity();
      const updateData: UpdateResourceData = {
        id: faker.string.uuid(),
        title: 'Updated Power Drill',
        community_id: mockCommunity.id,
      };

      const mockDbResource = createMockDbResource({
        id: updateData.id,
        title: updateData.title,
        creator_id: mockUser.id,
        community_id: mockCommunity.id,
        owner: {
          id: mockUser.id,
          email: mockUser.email,
          user_metadata: {
            first_name: mockUser.first_name,
            last_name: mockUser.last_name,
          },
          created_at: mockUser.created_at.toISOString(),
          updated_at: mockUser.updated_at.toISOString(),
        },
        community: {
          id: mockCommunity.id,
          name: mockCommunity.name,
          description: mockCommunity.description,
          member_count: mockCommunity.member_count,
          created_at: mockCommunity.created_at.toISOString(),
          updated_at: mockCommunity.updated_at.toISOString(),
        },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockDbResource,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useUpdateResource(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(updateData);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Resource updated successfully',
        { id: expect.any(String) }
      );
    });
  });

  describe('useDeleteResource', () => {
    it('should delete resource and invalidate cache', async () => {
      // Arrange
      const mockUser = createMockUser();
      const resourceId = faker.string.uuid();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null,
            }),
          }),
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const { result } = renderHook(() => useDeleteResource(), {
        wrapper: ReactQueryWrapper,
      });

      result.current.mutate(resourceId);

      // Assert
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        '📦 API: Resource deleted successfully',
        { id: resourceId }
      );
    });
  });
});