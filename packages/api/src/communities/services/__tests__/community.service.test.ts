import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommunityService } from '../community.service';
import { logger } from '@belongnetwork/core';
import type { CommunityData } from '@belongnetwork/types';
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
vi.mock('../../impl/communityTransformer', () => ({
  toCommunityInfo: vi.fn(),
  toDomainCommunity: vi.fn(),
  forDbInsert: vi.fn(),
}));

import { toCommunityInfo, toDomainCommunity, forDbInsert } from '../../impl/communityTransformer';

const mockLogger = vi.mocked(logger);
const mockToCommunityInfo = vi.mocked(toCommunityInfo);
const mockToDomainCommunity = vi.mocked(toDomainCommunity);
const mockForDbInsert = vi.mocked(forDbInsert);

describe('CommunityService', () => {
  let mockSupabase: any;
  let communityService: ReturnType<typeof createCommunityService>;

  const mockDbCommunity = {
    id: 'community-123',
    name: 'Test Community',
    description: 'Test Description',
    organizer_id: 'user-123',
    level: 'city',
    member_count: 150,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockCommunityInfo = {
    id: 'community-123',
    name: 'Test Community',
    description: 'Test Description',
    organizerId: 'user-123',
    level: 'city' as const,
    memberCount: 150,
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCommunity = {
    ...mockCommunityInfo,
    organizer: {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn(),
      auth: {
        getUser: vi.fn(),
      },
    };

    communityService = createCommunityService(mockSupabase);

    // Setup default transformer mocks
    mockToCommunityInfo.mockReturnValue(mockCommunityInfo);
    mockToDomainCommunity.mockReturnValue(mockCommunity);
    mockForDbInsert.mockReturnValue(mockDbCommunity);
  });

  describe('fetchCommunities', () => {
    it('should fetch active communities by default', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbCommunity], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunities();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockToCommunityInfo).toHaveBeenCalledWith(mockDbCommunity);
      expect(result).toEqual([mockCommunityInfo]);
      expect(mockLogger.debug).toHaveBeenCalledWith('🏘️ API: Fetching communities', { options: undefined });
    });

    it('should include deleted communities when requested', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbCommunity], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockQueryResult),
        eq: vi.fn()
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunities({ includeDeleted: true });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.eq).not.toHaveBeenCalled(); // Should not filter by is_active
      expect(result).toEqual([mockCommunityInfo]);
    });

    it('should handle empty results', async () => {
      // Arrange
      const mockQueryResult = { data: [], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunities();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle null data response', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunities();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const dbError = new Error('Database query failed');
      const mockQueryResult = { data: null, error: dbError };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(communityService.fetchCommunities()).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🏘️ API: Failed to fetch communities', { error: dbError });
    });

    it('should log success with count', async () => {
      // Arrange
      const mockQueryResult = { data: [mockDbCommunity, mockDbCommunity], error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await communityService.fetchCommunities();

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith('🏘️ API: Successfully fetched communities', {
        count: 2,
        includeDeleted: undefined,
      });
    });
  });

  describe('fetchCommunityById', () => {
    it('should fetch community by ID successfully', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbCommunity, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunityById('community-123');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'community-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockToDomainCommunity).toHaveBeenCalledWith(mockDbCommunity);
      expect(result).toEqual(mockCommunity);
    });

    it('should return null when community not found', async () => {
      // Arrange
      const mockQueryResult = { data: null, error: { code: 'PGRST116' } };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.fetchCommunityById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should include deleted community when requested', async () => {
      // Arrange
      const mockQueryResult = { data: mockDbCommunity, error: null };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockQueryResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      await communityService.fetchCommunityById('community-123', { includeDeleted: true });

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'community-123');
      expect(mockQuery.eq).not.toHaveBeenCalledWith('is_active', true);
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
      await expect(communityService.fetchCommunityById('community-123')).rejects.toThrow(dbError);
    });
  });

  describe('createCommunity', () => {
    const mockCommunityData: CommunityData = {
      name: 'New Community',
      description: 'A new community',
      organizerId: 'user-123',
      level: 'city',
      timeZone: 'America/New_York',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should create community successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      
      const mockInsertResult = { data: { id: 'new-community-123' }, error: null };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      });

      // Act
      const result = await communityService.createCommunity(mockCommunityData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockForDbInsert).toHaveBeenCalledWith(mockCommunityData);
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(result.id).toBe('new-community-123');
      expect(result.name).toBe(mockCommunityData.name);
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(communityService.createCommunity(mockCommunityData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Insert failed');
      const mockInsertResult = { data: null, error: dbError };
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(mockInsertResult),
      });

      // Act & Assert
      await expect(communityService.createCommunity(mockCommunityData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🏘️ API: Failed to create community', { error: dbError });
    });
  });

  describe('updateCommunity', () => {
    const mockUpdateData = {
      id: 'community-123',
      name: 'Updated Community',
      description: 'Updated description',
    };

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should update community successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateResult = { error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.updateCommunity(mockUpdateData);

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'community-123');
      expect(result.id).toBe('community-123');
      expect(result.name).toBe('Updated Community');
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(communityService.updateCommunity(mockUpdateData)).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Update failed');
      const mockUpdateResult = { error: dbError };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(communityService.updateCommunity(mockUpdateData)).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🏘️ API: Failed to update community', { error: dbError });
    });
  });

  describe('deleteCommunity', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should soft delete community successfully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdateResult = { error: null };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act
      const result = await communityService.deleteCommunity('community-123');

      // Assert
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'community-123');
      expect(result.success).toBe(true);
    });

    it('should throw error when user not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(communityService.deleteCommunity('community-123')).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database update fails', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const dbError = new Error('Delete failed');
      const mockUpdateResult = { error: dbError };
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(mockUpdateResult),
      };
      mockSupabase.from.mockReturnValue(mockQuery);

      // Act & Assert
      await expect(communityService.deleteCommunity('community-123')).rejects.toThrow(dbError);
      expect(mockLogger.error).toHaveBeenCalledWith('🏘️ API: Failed to delete community', { error: dbError });
    });
  });
});