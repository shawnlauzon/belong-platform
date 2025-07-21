import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFeed } from '../api/fetchFeed';
import { getCurrentUser } from '../../auth/api';
import { fetchUserCommunities } from '../../communities/api';

// Mock dependencies
vi.mock('../../auth/api');
vi.mock('../../communities/api');
vi.mock('@/shared', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockFetchUserCommunities = vi.mocked(fetchUserCommunities);

describe('fetchFeed', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
  });

  it('should return empty feed when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(fetchFeed(mockSupabase)).rejects.toThrow('User not authenticated');
  });

  it('should return empty feed when user has no communities', async () => {
    mockGetCurrentUser.mockResolvedValue({ id: 'user1' } as { id: string });
    mockFetchUserCommunities.mockResolvedValue([]);

    const result = await fetchFeed(mockSupabase);

    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
  });

  it('should fetch and return feed items sorted by creation date', async () => {
    const mockUser = { id: 'user1' };
    const mockCommunities = [
      { communityId: 'community1' },
      { communityId: 'community2' },
    ];

    mockGetCurrentUser.mockResolvedValue(mockUser as { id: string });
    mockFetchUserCommunities.mockResolvedValue(mockCommunities as { communityId: string }[]);

    // Mock resources query
    const mockResourcesQuery = {
      data: [
        { id: 'resource1', created_at: '2024-01-01T10:00:00Z', category: 'goods' },
        { id: 'resource2', created_at: '2024-01-01T12:00:00Z', category: 'services' },
      ],
      error: null,
    };

    // Mock shoutouts query  
    const mockShoutoutsQuery = {
      data: [
        { id: 'shoutout1', created_at: '2024-01-01T11:00:00Z' },
      ],
      error: null,
    };

    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockResourcesQuery),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockShoutoutsQuery),
        }),
      });

    const result = await fetchFeed(mockSupabase);

    expect(result.items).toHaveLength(3);
    expect(result.items).toEqual([
      { id: 'resource2', type: 'resource' }, // Newest first
      { id: 'shoutout1', type: 'shoutout' },
      { id: 'resource1', type: 'resource' }, // Oldest last
    ]);
    expect(result.hasMore).toBe(false);
  });

  it('should handle database errors for resources', async () => {
    const mockUser = { id: 'user1' };
    const mockCommunities = [{ communityId: 'community1' }];

    mockGetCurrentUser.mockResolvedValue(mockUser as { id: string });
    mockFetchUserCommunities.mockResolvedValue(mockCommunities as { communityId: string }[]);

    const mockResourcesError = new Error('Database error');
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({
          data: null,
          error: mockResourcesError,
        }),
      }),
    });

    await expect(fetchFeed(mockSupabase)).rejects.toThrow('Database error');
  });

  it('should handle database errors for shoutouts', async () => {
    const mockUser = { id: 'user1' };
    const mockCommunities = [{ communityId: 'community1' }];

    mockGetCurrentUser.mockResolvedValue(mockUser as { id: string });
    mockFetchUserCommunities.mockResolvedValue(mockCommunities as { communityId: string }[]);

    // Resources query succeeds
    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })
      // Shoutouts query fails
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Shoutouts database error'),
          }),
        }),
      });

    await expect(fetchFeed(mockSupabase)).rejects.toThrow('Shoutouts database error');
  });

  it('should handle null data from database queries', async () => {
    const mockUser = { id: 'user1' };
    const mockCommunities = [{ communityId: 'community1' }];

    mockGetCurrentUser.mockResolvedValue(mockUser as { id: string });
    mockFetchUserCommunities.mockResolvedValue(mockCommunities as { communityId: string }[]);

    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });

    const result = await fetchFeed(mockSupabase);

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it('should correctly categorize resources, events, and shoutouts', async () => {
    const mockUser = { id: 'user1' };
    const mockCommunities = [{ communityId: 'community1' }];

    mockGetCurrentUser.mockResolvedValue(mockUser as { id: string });
    mockFetchUserCommunities.mockResolvedValue(mockCommunities as { communityId: string }[]);

    // Mock resources query with mixed categories including events
    const mockResourcesQuery = {
      data: [
        { id: 'resource1', created_at: '2024-01-01T10:00:00Z', category: 'goods' },
        { id: 'event1', created_at: '2024-01-01T14:00:00Z', category: 'event' },
        { id: 'resource2', created_at: '2024-01-01T12:00:00Z', category: 'services' },
      ],
      error: null,
    };

    // Mock shoutouts query  
    const mockShoutoutsQuery = {
      data: [
        { id: 'shoutout1', created_at: '2024-01-01T11:00:00Z' },
      ],
      error: null,
    };

    mockSupabase.from
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockResourcesQuery),
        }),
      })
      .mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue(mockShoutoutsQuery),
        }),
      });

    const result = await fetchFeed(mockSupabase);

    expect(result.items).toHaveLength(4);
    expect(result.items).toEqual([
      { id: 'event1', type: 'event' }, // Event (newest)
      { id: 'resource2', type: 'resource' }, // Resource
      { id: 'shoutout1', type: 'shoutout' }, // Shoutout
      { id: 'resource1', type: 'resource' }, // Resource (oldest)
    ]);
    expect(result.hasMore).toBe(false);
  });
});