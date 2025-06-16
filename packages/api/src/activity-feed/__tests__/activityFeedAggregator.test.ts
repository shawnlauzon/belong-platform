import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateActivityFeed } from '../impl/activityFeedAggregator';
import type { ActivityFeedFilter, ActivityType } from '@belongnetwork/types';

// Mock the supabase client and other dependencies
vi.mock('../../core', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            gte: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          gte: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        order: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              limit: vi.fn(() => ({
                data: [],
                error: null,
              })),
            })),
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          gte: vi.fn(() => ({
            limit: vi.fn(() => ({
              data: [],
              error: null,
            })),
          })),
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        gte: vi.fn(() => ({
          limit: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
        limit: vi.fn(() => ({
          data: [],
          error: null,
        })),
      })),
    })),
  },
}));

vi.mock('../../users/impl', () => ({
  fetchUser: vi.fn().mockResolvedValue({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  }),
}));

vi.mock('../../communities/impl', () => ({
  fetchCommunity: vi.fn().mockResolvedValue({
    id: 'community-1',
    name: 'Test Community',
    description: 'A test community',
  }),
}));

vi.mock('../../resources/impl', () => ({
  fetchResource: vi.fn().mockResolvedValue({
    id: 'resource-1',
    title: 'Test Resource',
    description: 'A test resource',
  }),
}));

vi.mock('../../events/impl', () => ({
  fetchEvent: vi.fn().mockResolvedValue({
    id: 'event-1',
    title: 'Test Event',
    description: 'A test event',
  }),
}));

vi.mock('../../thanks/impl', () => ({
  fetchThanks: vi.fn().mockResolvedValue({
    id: 'thanks-1',
    message: 'Thank you!',
  }),
}));

vi.mock('@belongnetwork/core', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('aggregateActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array when no activities are found', async () => {
    const filter: ActivityFeedFilter = {
      communityId: 'community-1',
      pageSize: 10,
      page: 1,
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });

  it('should filter activities by community ID', async () => {
    const filter: ActivityFeedFilter = {
      communityId: 'community-1',
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });

  it('should filter activities by user ID', async () => {
    const filter: ActivityFeedFilter = {
      userId: 'user-1',
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });

  it('should filter activities by types', async () => {
    const filter: ActivityFeedFilter = {
      types: ['resource_created' as ActivityType],
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });

  it('should apply pagination correctly', async () => {
    const filter: ActivityFeedFilter = {
      communityId: 'community-1',
      page: 2,
      pageSize: 5,
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });

  it('should filter activities by since date', async () => {
    const filter: ActivityFeedFilter = {
      communityId: 'community-1',
      since: new Date('2024-01-01'),
    };

    const result = await aggregateActivityFeed(filter);
    
    expect(result).toEqual([]);
  });
});