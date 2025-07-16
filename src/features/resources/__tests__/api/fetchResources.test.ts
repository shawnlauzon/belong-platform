import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchResources } from '../../api/fetchResources';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResourceRow } from '../../__fakes__';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../shared/types/database';
import type { ResourceFilter } from '../../types';

describe('fetchResources', () => {
  let mockSupabase: SupabaseClient<Database>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase({});
  });

  it('should fetch all resources when no filters provided', async () => {
    // Arrange
    const fakeResource = createFakeResourceRow();
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [fakeResource],
        error: null,
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    // Act
    const result = await fetchResources(mockSupabase);

    // Assert
    expect(result).toHaveLength(1);
    expect(mockSupabase.from).toHaveBeenCalledWith('resources');
  });

  it('should throw error when database query fails', async () => {
    // Arrange
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Database error'),
      }),
    };

    vi.mocked(mockSupabase.from).mockReturnValue(mockQuery as ReturnType<typeof mockSupabase.from>);

    // Act & Assert
    await expect(fetchResources(mockSupabase)).rejects.toThrow('Database error');
  });

  describe('time filtering', () => {
    it('should exclude expired resources by default when includeExpired is false', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        includeExpired: false,
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith('expires_at.is.null,expires_at.gte.now()');
    });

    it('should exclude past resources when includePast is false', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        includePast: false,
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith('expires_at.is.null,expires_at.gte.now()');
    });

    it('should not apply time filters when all time flags are true', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        includeCurrent: true,
        includeUpcoming: true,
        includePast: true,
        includeExpired: true,
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.or).not.toHaveBeenCalled();
    });

    it('should apply combined time filters correctly', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        includePast: false,
        includeExpired: false,
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      // Should be called twice - once for includePast and once for includeExpired
      expect(mockQuery.or).toHaveBeenCalledTimes(2);
      expect(mockQuery.or).toHaveBeenCalledWith('expires_at.is.null,expires_at.gte.now()');
    });
  });

  describe('other filters', () => {
    it('should filter by category', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        category: 'tools',
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'tools');
    });

    it('should filter by community IDs', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        communityIds: ['community-1', 'community-2'],
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.in).toHaveBeenCalledWith('community_id', ['community-1', 'community-2']);
    });

    it('should filter by search term', async () => {
      // Arrange
      const fakeResource = createFakeResourceRow();
      const mockQuery = {
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [fakeResource],
          error: null,
        }),
      };
      
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue(mockQuery),
      } as any);

      const filters: ResourceFilter = {
        searchTerm: 'guitar',
      };

      // Act
      await fetchResources(mockSupabase, filters);

      // Assert
      expect(mockQuery.or).toHaveBeenCalledWith(
        'title.ilike.%guitar%,description.ilike.%guitar%'
      );
    });
  });
});