import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchThanks, fetchThanksById } from '../impl/fetchThanks';
import { createMockDbThanks } from './test-utils';
import { createMockUser, createMockResource, setupBelongClientMocks } from '../../test-utils';
import * as fetchUserById from '../../users/impl/fetchUserById';
import * as fetchResourceById from '../../resources/impl/fetchResources';

// Mock the getBelongClient function
vi.mock('@belongnetwork/core', () => ({
  getBelongClient: vi.fn()
}));

describe('fetchThanks', () => {
  const mockFromUser = createMockUser({ id: 'user-123' });
  const mockToUser = createMockUser({ id: 'user-456' });
  const mockResource = createMockResource({ id: 'resource-789' });
  
  const mockDbThanks = [
    createMockDbThanks({
      id: 'thanks-1',
      from_user_id: 'user-123',
      to_user_id: 'user-456',
      resource_id: 'resource-789',
    }),
    createMockDbThanks({
      id: 'thanks-2',
      from_user_id: 'user-456',
      to_user_id: 'user-123',
      resource_id: 'resource-789',
    }),
  ];

  let mockSupabase: any;
  let mockLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ({ mockSupabase, mockLogger } = setupBelongClientMocks());
    
    // Mock the fetch functions
    vi.spyOn(fetchUserById, 'fetchUserById')
      .mockImplementation((id) => {
        if (id === 'user-123') return Promise.resolve(mockFromUser);
        if (id === 'user-456') return Promise.resolve(mockToUser);
        return Promise.resolve(null);
      });
    vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(mockResource);
  });

  describe('fetchThanks', () => {
    it('should fetch all thanks when no filters provided', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockDbThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanks();

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.select).toHaveBeenCalledWith('*');
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'thanks-1',
        fromUserId: 'user-123',
        toUserId: 'user-456',
        resourceId: 'resource-789',
        communityId: expect.any(String),
      });
      // ThanksInfo should not have nested objects
      expect(result[0]).not.toHaveProperty('fromUser');
      expect(result[0]).not.toHaveProperty('toUser');
      expect(result[0]).not.toHaveProperty('resource');
    });

    it('should filter thanks by sentBy user', async () => {
      // Arrange
      const filteredThanks = [mockDbThanks[0]];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: filteredThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanks({ sentBy: 'user-123' });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('from_user_id', 'user-123');
      expect(result).toHaveLength(1);
      expect(result[0].fromUserId).toBe('user-123');
    });

    it('should filter thanks by receivedBy user', async () => {
      // Arrange
      const filteredThanks = [mockDbThanks[1]];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: filteredThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanks({ receivedBy: 'user-123' });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('to_user_id', 'user-123');
      expect(result).toHaveLength(1);
    });

    it('should filter thanks by resourceId', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: mockDbThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanks({ resourceId: 'resource-789' });

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('resource_id', 'resource-789');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no data', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanks();

      // Assert
      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(fetchThanks()).rejects.toThrow(mockError);
    });

    it('should filter out thanks with missing resource', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockDbThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Mock resource fetch to return null (missing resource)
      vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

      // Act
      const result = await fetchThanks();

      // Assert - Should filter out thanks where resource is missing
      expect(result).toHaveLength(0);
    });
  });

  describe('fetchThanksById', () => {
    it('should fetch thanks by ID', async () => {
      // Arrange
      const mockThanks = mockDbThanks[0];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanksById('thanks-1');

      // Assert
      expect(mockSupabase.from).toHaveBeenCalledWith('thanks');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'thanks-1');
      expect(result).toMatchObject({
        id: 'thanks-1',
        fromUser: expect.objectContaining({ id: 'user-123' }),
        toUser: expect.objectContaining({ id: 'user-456' }),
        resource: expect.objectContaining({ id: 'resource-789' }),
      });
    });

    it('should return null when thanks not found', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanksById('nonexistent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when data is null', async () => {
      // Arrange
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act
      const result = await fetchThanksById('thanks-1');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      const mockError = { code: 'SOME_ERROR', message: 'Database error' };
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Act & Assert
      await expect(fetchThanksById('thanks-1')).rejects.toThrow();
    });

    it('should throw error when dependencies are missing', async () => {
      // Arrange
      const mockThanks = mockDbThanks[0];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockThanks,
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Mock resource fetch to return null
      vi.spyOn(fetchResourceById, 'fetchResourceById').mockResolvedValue(null);

      // Act & Assert
      await expect(fetchThanksById('thanks-1')).rejects.toThrow('Failed to process thanks data');
    });
  });
});