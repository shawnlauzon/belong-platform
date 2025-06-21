import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createThanksService } from '../thanks.service';
import { logger } from '@belongnetwork/core';
import type { ThanksData, ThanksFilter } from '@belongnetwork/types';
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
vi.mock('../../impl/thanksTransformer', () => ({
  toThanksInfo: vi.fn(),
  toDomainThanks: vi.fn(),
  forDbInsert: vi.fn(),
  forDbUpdate: vi.fn(),
}));

// Mock the other services
vi.mock('../../../users/services/user.service', () => ({
  createUserService: vi.fn(),
}));

vi.mock('../../../resources/services/resource.service', () => ({
  createResourceService: vi.fn(),
}));

import { toThanksInfo, toDomainThanks, forDbInsert, forDbUpdate } from '../../impl/thanksTransformer';
import { createUserService } from '../../../users/services/user.service';
import { createResourceService } from '../../../resources/services/resource.service';

const mockLogger = vi.mocked(logger);
const mockToThanksInfo = vi.mocked(toThanksInfo);
const mockToDomainThanks = vi.mocked(toDomainThanks);
const mockForDbInsert = vi.mocked(forDbInsert);
const mockForDbUpdate = vi.mocked(forDbUpdate);
const mockCreateUserService = vi.mocked(createUserService);
const mockCreateResourceService = vi.mocked(createResourceService);

describe('ThanksService', () => {
  let mockSupabase: any;
  let thanksService: ReturnType<typeof createThanksService>;

  const mockDbThanks = {
    id: 'thanks-123',
    message: 'Thank you for the help!',
    from_user_id: 'user-123',
    to_user_id: 'user-456',
    resource_id: 'resource-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockThanksInfo = {
    id: 'thanks-123',
    message: 'Thank you for the help!',
    fromUserId: 'user-123',
    toUserId: 'user-456',
    resourceId: 'resource-123',
    communityId: 'community-123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockFromUser = {
    id: 'user-123',
    email: 'from@example.com',
    firstName: 'From',
    lastName: 'User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockToUser = {
    id: 'user-456',
    email: 'to@example.com',
    firstName: 'To',
    lastName: 'User',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockResource = {
    id: 'resource-123',
    title: 'Test Resource',
    description: 'Test Description',
    community: {
      id: 'community-123',
      name: 'Test Community',
    },
    owner: mockFromUser,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockThanks = {
    id: 'thanks-123',
    message: 'Thank you for the help!',
    fromUser: mockFromUser,
    toUser: mockToUser,
    resource: mockResource,
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

    thanksService = createThanksService(mockSupabase);

    // Setup default transformer mocks
    mockToThanksInfo.mockReturnValue(mockThanksInfo);
    mockToDomainThanks.mockReturnValue(mockThanks);
    mockForDbInsert.mockReturnValue(mockDbThanks);
    mockForDbUpdate.mockReturnValue(mockDbThanks);

    // Setup service mocks
    const mockUserService = {
      fetchUserById: vi.fn(),
    };
    const mockResourceService = {
      fetchResourceById: vi.fn().mockResolvedValue(mockResource),
    };
    
    // Set up specific user mocks based on ID
    mockUserService.fetchUserById.mockImplementation((id: string) => {
      if (id === 'user-123') return Promise.resolve(mockFromUser);
      if (id === 'user-456') return Promise.resolve(mockToUser);
      return Promise.resolve(null);
    });

    mockCreateUserService.mockReturnValue(mockUserService as any);
    mockCreateResourceService.mockReturnValue(mockResourceService as any);
  });

  describe('fetchThanks', () => {
    it('should fetch thanks successfully', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbThanks], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await thanksService.fetchThanks();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mockCreateResourceService).toHaveBeenCalledWith(mockSupabase);
      expect(mockToThanksInfo).toHaveBeenCalledWith(
        mockDbThanks,
        'user-123',
        'user-456',
        'resource-123',
        'community-123'
      );
      expect(result).toEqual([mockThanksInfo]);
      expect(mockLogger.debug).toHaveBeenCalledWith('🙏 Thanks Service: Fetching thanks', { filters: undefined });
    });

    it('should apply sentBy filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbThanks], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ThanksFilter = { sentBy: 'user-123' };

      // Act
      const result = await thanksService.fetchThanks(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('from_user_id', 'user-123');
      expect(result).toEqual([mockThanksInfo]);
    });

    it('should apply receivedBy filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbThanks], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ThanksFilter = { receivedBy: 'user-456' };

      // Act
      const result = await thanksService.fetchThanks(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('to_user_id', 'user-456');
      expect(result).toEqual([mockThanksInfo]);
    });

    it('should apply resourceId filter when provided', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbThanks], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const filters: ThanksFilter = { resourceId: 'resource-123' };

      // Act
      const result = await thanksService.fetchThanks(filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('resource_id', 'resource-123');
      expect(result).toEqual([mockThanksInfo]);
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
      const result = await thanksService.fetchThanks();

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
      const result = await thanksService.fetchThanks();

      // Assert
      expect(result).toEqual([]);
    });

    it('should filter out thanks with missing resources', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbThanks], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const mockResourceService = {
        fetchResourceById: vi.fn().mockResolvedValue(null),
      };
      mockCreateResourceService.mockReturnValue(mockResourceService as any);

      // Act
      const result = await thanksService.fetchThanks();

      // Assert
      expect(result).toEqual([]);
      expect(mockLogger.warn).toHaveBeenCalledWith('🙏 Thanks Service: Resource not found for thanks', {
        thanksId: 'thanks-123',
        resourceId: 'resource-123',
      });
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
      await expect(thanksService.fetchThanks()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🙏 Thanks Service: Failed to fetch thanks', { error: dbError });
    });
  });

  describe('fetchThanksById', () => {
    it('should fetch thanks by ID successfully', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbThanks, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await thanksService.fetchThanksById('thanks-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'thanks-123');
      expect(mockCreateUserService).toHaveBeenCalledWith(mockSupabase);
      expect(mockCreateResourceService).toHaveBeenCalledWith(mockSupabase);
      expect(mockToDomainThanks).toHaveBeenCalledWith(mockDbThanks, mockFromUser, mockToUser, mockResource);
      expect(result).toEqual(mockThanks);
    });

    it('should return null when thanks not found', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: { code: 'PGRST116' } };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await thanksService.fetchThanksById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when required entities not found', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbThanks, error: null };
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
      await expect(thanksService.fetchThanksById('thanks-123')).rejects.toThrow('Required related entities not found');
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
      await expect(thanksService.fetchThanksById('thanks-123')).rejects.toThrow(dbError);
    });
  });

  describe('createThanks', () => {
    const mockThanksData: ThanksData = {
      message: 'Thank you so much!',
      toUserId: 'user-456',
      resourceId: 'resource-123',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should create thanks successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsertResult = { data: mockDbThanks, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await thanksService.createThanks(mockThanksData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbInsert).toHaveBeenCalledWith(mockThanksData, 'user-123');
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.insert).toHaveBeenCalledWith([mockDbThanks]);
      expect(mockToDomainThanks).toHaveBeenCalledWith(mockDbThanks, mockFromUser, mockToUser, mockResource);
      expect(result).toEqual(mockThanks);
      expect(mockLogger.info).toHaveBeenCalledWith('🙏 Thanks Service: Successfully created thanks', {
        id: mockThanks.id,
        fromUserId: mockThanks.fromUser.id,
        toUserId: mockThanks.toUser.id,
        resourceId: mockThanks.resource.id,
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(thanksService.createThanks(mockThanksData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
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
      await expect(thanksService.createThanks(mockThanksData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🙏 Thanks Service: Failed to create thanks', { error: dbError });
    });

    it('should throw error when required entities not found after creation', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockInsertResult = { data: mockDbThanks, error: null };
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      const mockResourceService = {
        fetchResourceById: vi.fn().mockResolvedValue(null),
      };
      mockCreateResourceService.mockReturnValue(mockResourceService as any);

      // Act & Assert
      await expect(thanksService.createThanks(mockThanksData)).rejects.toThrow('Required related entities not found');
    });
  });

  describe('updateThanks', () => {
    const mockUpdateData = {
      message: 'Updated thank you message',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should update thanks successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateResult = { data: mockDbThanks, error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await thanksService.updateThanks('thanks-123', mockUpdateData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbUpdate).toHaveBeenCalledWith(mockUpdateData);
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'thanks-123');
      expect(mockToDomainThanks).toHaveBeenCalledWith(mockDbThanks, mockFromUser, mockToUser, mockResource);
      expect(result).toEqual(mockThanks);
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(thanksService.updateThanks('thanks-123', mockUpdateData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
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
      await expect(thanksService.updateThanks('thanks-123', mockUpdateData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🙏 Thanks Service: Failed to update thanks', { id: 'thanks-123', error: dbError });
    });
  });

  describe('deleteThanks', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should delete thanks successfully when user is sender', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // Mock the fetch query for ownership check
      const mockFetchResult = { data: { from_user_id: 'user-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      // Mock the delete query
      const mockDeleteResult = { error: null };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockDeleteResult),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFetchQuery) // First call for ownership check
        .mockReturnValueOnce(mockDeleteQuery); // Second call for delete

      // Act
      const result = await thanksService.deleteThanks('thanks-123');

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockFetchQuery.select).toHaveBeenCalledWith('from_user_id');
      expect(mockFetchQuery.eq).toHaveBeenCalledWith('id', 'thanks-123');
      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('id', 'thanks-123');
      expect(result).toBeUndefined();
      expect(mockLogger.info).toHaveBeenCalledWith('🙏 Thanks Service: Successfully deleted thanks', {
        id: 'thanks-123',
      });
    });

    it('should return early when thanks not found', async () => {
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
      const result = await thanksService.deleteThanks('nonexistent-thanks');

      // Assert
      expect(result).toBeUndefined();
      expect(mockLogger.debug).toHaveBeenCalledWith('🙏 Thanks Service: Thanks not found for deletion', {
        id: 'nonexistent-thanks',
      });
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(thanksService.deleteThanks('thanks-123')).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when user is not the sender', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: { from_user_id: 'other-user' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      mockSupabase.from.mockReturnValue(mockFetchQuery);

      // Act & Assert
      await expect(thanksService.deleteThanks('thanks-123')).rejects.toThrow('You are not authorized to delete this thanks');
    });

    it('should throw error when database delete fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockFetchResult = { data: { from_user_id: 'user-123' }, error: null };
      const mockFetchQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockFetchResult),
      };

      const dbError = new Error('Delete failed');
      const mockDeleteResult = { error: dbError };
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockDeleteResult),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockFetchQuery)
        .mockReturnValueOnce(mockDeleteQuery);

      // Act & Assert
      await expect(thanksService.deleteThanks('thanks-123')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🙏 Thanks Service: Failed to delete thanks', {
        id: 'thanks-123',
        error: dbError.message,
        code: undefined,
      });
    });
  });
});