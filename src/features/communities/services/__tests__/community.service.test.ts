import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCommunityService } from '../community.service';
import { createMockCommunity } from '../../__mocks__';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MESSAGE_AUTHENTICATION_REQUIRED } from '../../../../shared/constants';
import { createMockUser } from '../../../users/__mocks__';
import {
  createMockDbCommunities,
  QuerySetups,
  CommunityServiceAssertions,
  AuthMocks,
  TestData,
} from '../../__tests__/communityServiceTestUtils';

// Mock the logger
vi.mock('../../../../shared', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock transformers
vi.mock('../transformers/communityTransformer', () => ({
  toCommunityInfo: vi.fn((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    level: data.level,
  })),
  toDomainCommunity: vi.fn((data) => ({
    id: data.id,
    name: data.name,
    description: data.description,
    level: data.level,
    timeZone: data.time_zone,
    organizer: data.organizer
      ? {
          id: data.organizer.id,
          firstName: data.organizer.first_name,
          lastName: data.organizer.last_name,
          email: data.organizer.email,
          createdAt: new Date(data.organizer.created_at),
          updatedAt: new Date(data.organizer.updated_at),
        }
      : undefined,
    parentId: data.parent_id,
    hierarchyPath: data.hierarchy_path ? JSON.parse(data.hierarchy_path) : [],
    memberCount: data.member_count || 0,
    isActive: data.is_active,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  })),
  forDbInsert: vi.fn((data) => ({
    name: data.name,
    description: data.description,
    level: data.level,
    time_zone: data.timeZone,
    organizer_id: data.organizerId,
    parent_id: data.parentId,
    hierarchy_path: data.hierarchyPath
      ? JSON.stringify(data.hierarchyPath)
      : null,
    member_count: data.memberCount || 0,
  })),
}));

describe('createCommunityService', () => {
  let mockSupabase: Partial<SupabaseClient>;
  let communityService: ReturnType<typeof createCommunityService>;
  let mockCommunity: ReturnType<typeof createMockCommunity>;
  let mockUser: ReturnType<typeof createMockUser>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCommunity = createMockCommunity();
    mockUser = createMockUser();

    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
    } as any;

    communityService = createCommunityService(mockSupabase as SupabaseClient);
  });

  describe('fetchCommunities', () => {
    it('should fetch active communities by default', async () => {
      // Arrange
      const mockDbCommunities = createMockDbCommunities(2, mockUser, {
        is_active: true,
      });
      const mockQuery = QuerySetups.fetchCommunities(
        mockSupabase,
        mockDbCommunities
      );

      // Act
      const result = await communityService.fetchCommunities();

      // Assert
      CommunityServiceAssertions.expectFetchCommunitiesQuery(
        mockSupabase,
        mockQuery
      );
      CommunityServiceAssertions.expectResultLength(result, 2);
    });

    it('should include deleted communities when requested', async () => {
      // Arrange
      const mockDbCommunities = [
        { id: '1', name: 'Community 1', is_active: true },
        { id: '2', name: 'Community 2', is_active: false },
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.eq.mockResolvedValue({
        data: mockDbCommunities,
        error: null,
      });

      // Act
      const result = await communityService.fetchCommunities({
        isActive: false,
      });

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', false);
      expect(result).toHaveLength(1); // Only the inactive community should pass the filter
    });


    it('should throw error when database query fails', async () => {
      // Arrange
      const error = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.eq.mockResolvedValue({ data: null, error });

      // Act & Assert
      await expect(communityService.fetchCommunities()).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('fetchCommunityById', () => {
    it('should fetch community by ID with organizer data', async () => {
      // Arrange
      const mockDbCommunity = {
        id: mockCommunity.id,
        name: mockCommunity.name,
        description: mockCommunity.description,
        level: mockCommunity.level,
        time_zone: mockCommunity.timeZone,
        organizer: {
          id: mockUser.id,
          first_name: mockUser.firstName,
          last_name: mockUser.lastName,
          email: mockUser.email,
          created_at: mockUser.createdAt.toISOString(),
          updated_at: mockUser.updatedAt.toISOString(),
        },
        is_active: true,
        created_at: mockCommunity.createdAt.toISOString(),
        updated_at: mockCommunity.updatedAt.toISOString(),
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.single.mockResolvedValue({
        data: mockDbCommunity,
        error: null,
      });

      // Act
      const result = await communityService.fetchCommunityById(
        mockCommunity.id
      );

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.select).toHaveBeenCalledWith(
        '*, organizer:profiles!communities_organizer_id_fkey(*)'
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockCommunity.id);
      expect(mockQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(result).toBeDefined();
      expect(result?.id).toBe(mockCommunity.id);
    });

    it('should return null when community not found', async () => {
      // Arrange
      const error = { code: 'PGRST116' }; // Not found error
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.single.mockResolvedValue({ data: null, error });

      // Act
      const result =
        await communityService.fetchCommunityById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error for other database errors', async () => {
      // Arrange
      const error = { code: 'OTHER_ERROR', message: 'Database error' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.single.mockResolvedValue({ data: null, error });

      // Act & Assert
      await expect(
        communityService.fetchCommunityById('test-id')
      ).rejects.toEqual(error);
    });
  });

  describe('createCommunity', () => {
    it('should create community when user is authenticated', async () => {
      // Arrange
      const communityData = {
        name: 'New Community',
        description: 'A test community',
        level: 'neighborhood' as const,
        timeZone: 'America/New_York',
        organizerId: mockUser.id,
        memberCount: 0,
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      const mockMembershipQuery = {
        insert: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(mockQuery as any) // First call for community creation
        .mockReturnValueOnce(mockMembershipQuery as any); // Second call for membership creation

      mockQuery.single.mockResolvedValue({
        data: { id: 'new-community-id' },
        error: null,
      });

      mockMembershipQuery.insert.mockResolvedValue({
        data: null,
        error: null,
      });

      // Act
      const result = await communityService.createCommunity(communityData);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(result.id).toBe('new-community-id');
      expect(result.name).toBe(communityData.name);
      expect(result.isActive).toBe(true);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const communityData = {
        name: 'New Community',
        description: 'A test community',
        level: 'neighborhood' as const,
        timeZone: 'America/New_York',
        organizerId: mockUser.id,
        memberCount: 0,
      };

      // Act & Assert
      await expect(
        communityService.createCommunity(communityData)
      ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });

    it('should throw error when database insert fails', async () => {
      // Arrange
      const communityData = {
        name: 'New Community',
        description: 'A test community',
        level: 'neighborhood' as const,
        timeZone: 'America/New_York',
        organizerId: mockUser.id,
        memberCount: 0,
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const error = new Error('Database insert failed');
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.single.mockResolvedValue({ data: null, error });

      // Act & Assert
      await expect(
        communityService.createCommunity(communityData)
      ).rejects.toThrow('Database insert failed');
    });
  });

  describe('updateCommunity', () => {
    it('should update community when user is authenticated', async () => {
      // Arrange
      const updateData = {
        id: mockCommunity.id,
        name: 'Updated Community',
        description: 'Updated description',
      };

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.eq.mockResolvedValue({ error: null });

      // Act
      const result = await communityService.updateCommunity(updateData);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', updateData.id);
      expect(result.id).toBe(updateData.id);
      expect(result.name).toBe(updateData.name);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const updateData = {
        id: mockCommunity.id,
        name: 'Updated Community',
      };

      // Act & Assert
      await expect(
        communityService.updateCommunity(updateData)
      ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });
  });

  describe('deleteCommunity', () => {
    it('should soft delete community when user is authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);
      mockQuery.eq.mockResolvedValue({ error: null });

      // Act
      const result = await communityService.deleteCommunity(mockCommunity.id);

      // Assert
      expect(mockSupabase.auth!.getUser).toHaveBeenCalled();
      expect(mockSupabase.from).toHaveBeenCalledWith('communities');
      expect(mockQuery.update).toHaveBeenCalledWith({
        is_active: false,
        deleted_at: expect.any(String),
        deleted_by: mockUser.id,
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', mockCommunity.id);
      expect(result.success).toBe(true);
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(
        communityService.deleteCommunity(mockCommunity.id)
      ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });
  });

  describe('joinCommunity', () => {
    it('should allow user to join community', async () => {
      // Arrange
      const communityId = mockCommunity.id;
      const role = 'member';

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock check for existing membership (not found)
      const mockSelectQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockSelectQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      // Mock insert membership
      const mockInsertQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockInsertQuery.single.mockResolvedValue({
        data: {
          user_id: mockUser.id,
          community_id: communityId,
          role,
          joined_at: new Date().toISOString(),
        },
        error: null,
      });

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(mockSelectQuery as any)
        .mockReturnValueOnce(mockInsertQuery as any);

      // Act
      const result = await communityService.joinCommunity(communityId, role);

      // Assert
      expect(result.userId).toBe(mockUser.id);
      expect(result.communityId).toBe(communityId);
      expect(result.role).toBe(role);
    });

    it('should throw error when user is already a member', async () => {
      // Arrange
      const communityId = mockCommunity.id;

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockQuery.single.mockResolvedValue({
        data: { user_id: mockUser.id, community_id: communityId },
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(communityService.joinCommunity(communityId)).rejects.toThrow(
        'User is already a member of this community'
      );
    });

    it('should throw error when user is not authenticated', async () => {
      // Arrange
      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      // Act & Assert
      await expect(
        communityService.joinCommunity(mockCommunity.id)
      ).rejects.toThrow(MESSAGE_AUTHENTICATION_REQUIRED);
    });
  });

  describe('leaveCommunity', () => {
    it('should allow user to leave community', async () => {
      // Arrange
      const communityId = mockCommunity.id;

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock check for existing membership
      const mockSelectMembershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockSelectMembershipQuery.single.mockResolvedValue({
        data: { user_id: mockUser.id, community_id: communityId },
        error: null,
      });

      // Mock check for community organizer
      const mockSelectCommunityQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockSelectCommunityQuery.single.mockResolvedValue({
        data: { organizer_id: 'different-user-id' },
        error: null,
      });

      // Mock delete membership with chaining support
      const mockDeleteQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(mockSelectMembershipQuery as any)
        .mockReturnValueOnce(mockSelectCommunityQuery as any)
        .mockReturnValueOnce(mockDeleteQuery as any);

      // Act
      await communityService.leaveCommunity(communityId);

      // Assert
      expect(mockDeleteQuery.delete).toHaveBeenCalled();
      expect(mockDeleteQuery.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should throw error when user is not a member', async () => {
      // Arrange
      const communityId = mockCommunity.id;

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock community check (user is not organizer)
      const mockCommunityQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockCommunityQuery.single.mockResolvedValue({
        data: { organizer_id: 'different-user-id' },
        error: null,
      });

      // Mock membership check (user is not a member)
      const mockMembershipQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockMembershipQuery.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }, // Not found
      });

      vi.mocked(mockSupabase.from)
        .mockReturnValueOnce(mockCommunityQuery as any) // First call checks organizer
        .mockReturnValueOnce(mockMembershipQuery as any); // Second call checks membership

      // Act & Assert
      await expect(
        communityService.leaveCommunity(communityId)
      ).rejects.toThrow('User is not a member of this community');
    });

    it('should throw error when organizer tries to leave their own community', async () => {
      // Arrange
      const communityId = mockCommunity.id;

      vi.mocked(mockSupabase.auth!.getUser).mockResolvedValue({
        data: { user: { id: mockUser.id } },
        error: null,
      });

      // Mock check for community organizer (user is organizer)
      const mockSelectCommunityQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
      mockSelectCommunityQuery.single.mockResolvedValue({
        data: { organizer_id: mockUser.id },
        error: null,
      });

      vi.mocked(mockSupabase.from).mockReturnValueOnce(
        mockSelectCommunityQuery as any
      );

      // Act & Assert
      await expect(
        communityService.leaveCommunity(communityId)
      ).rejects.toThrow('Organizer cannot leave their own community');
    });
  });
});
