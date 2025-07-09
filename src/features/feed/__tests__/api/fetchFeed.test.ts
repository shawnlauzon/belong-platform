import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFeed } from '../../api';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResourceInfo } from '../../../resources/__fakes__';
import { createFakeEventInfo } from '../../../events/__fakes__';
import { createFakeShoutoutInfo } from '../../../shoutouts/__fakes__';

// Mock the API functions
vi.mock('../../../resources/api', () => ({
  fetchResources: vi.fn(),
}));

vi.mock('../../../events/api', () => ({
  fetchEvents: vi.fn(),
}));

vi.mock('../../../shoutouts/api', () => ({
  fetchShoutouts: vi.fn(),
}));

vi.mock('../../../communities/api', () => ({
  fetchUserCommunities: vi.fn(),
}));

vi.mock('../../../auth/api', () => ({
  getCurrentUser: vi.fn(),
}));

import { fetchResources } from '../../../resources/api';
import { fetchEvents } from '../../../events/api';
import { fetchShoutouts } from '../../../shoutouts/api';
import { fetchUserCommunities } from '../../../communities/api';
import { getCurrentUser } from '../../../auth/api';

const mockFetchResources = vi.mocked(fetchResources);
const mockFetchEvents = vi.mocked(fetchEvents);
const mockFetchShoutouts = vi.mocked(fetchShoutouts);
const mockFetchUserCommunities = vi.mocked(fetchUserCommunities);
const mockGetCurrentUser = vi.mocked(getCurrentUser);

describe('fetchFeed', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase({});
  });

  it('should return empty feed when user is not authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(null);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
    expect(mockFetchUserCommunities).not.toHaveBeenCalled();
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(mockFetchEvents).not.toHaveBeenCalled();
  });

  it('should return empty feed when user has no communities', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
    expect(mockFetchUserCommunities).toHaveBeenCalledWith(mockSupabase, 'user-1');
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(mockFetchEvents).not.toHaveBeenCalled();
    expect(mockFetchShoutouts).not.toHaveBeenCalled();
  });

  it('should fetch and combine resources, events, and shoutouts from user communities', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const fakeResourceInfo = createFakeResourceInfo({ communityId: 'community-1' });
    const fakeEventInfo = createFakeEventInfo({ communityId: 'community-1' });
    const fakeShoutoutInfo = createFakeShoutoutInfo({ 
      fromUserId: 'user-2', 
      toUserId: 'user-1', 
      resourceId: 'resource-1' 
    });
    const fakeMembership = { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() };
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([fakeResourceInfo]);
    mockFetchEvents.mockResolvedValue([fakeEventInfo]);
    mockFetchShoutouts.mockResolvedValue([fakeShoutoutInfo]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(3);
    // Since we're sorting by createdAt, the order depends on the fake data created times
    expect(result.items).toEqual(
      expect.arrayContaining([
        {
          type: 'resource',
          data: fakeResourceInfo,
        },
        {
          type: 'event',
          data: fakeEventInfo,
        },
        {
          type: 'shoutout',
          data: fakeShoutoutInfo,
        },
      ])
    );
  });

  it('should sort items by creation date newest first', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const olderResource = createFakeResourceInfo({ 
      createdAt: new Date('2023-01-01'), 
      communityId: 'community-1' 
    });
    const newerResource = createFakeResourceInfo({ 
      createdAt: new Date('2023-01-02'), 
      communityId: 'community-1' 
    });
    const newerEvent = createFakeEventInfo({ 
      createdAt: new Date('2023-01-03'), 
      communityId: 'community-1' 
    });
    const olderEvent = createFakeEventInfo({ 
      createdAt: new Date('2023-01-01'), 
      communityId: 'community-1' 
    });
    const newestShoutout = createFakeShoutoutInfo({ 
      createdAt: new Date('2023-01-04'), 
      fromUserId: 'user-2', 
      toUserId: 'user-1', 
      resourceId: 'resource-1' 
    });
    
    const fakeMembership = { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() };
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([olderResource, newerResource]);
    mockFetchEvents.mockResolvedValue([olderEvent, newerEvent]);
    mockFetchShoutouts.mockResolvedValue([newestShoutout]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(5);
    expect(result.items[0].data.createdAt).toEqual(new Date('2023-01-04'));
    expect(result.items[1].data.createdAt).toEqual(new Date('2023-01-03'));
    expect(result.items[2].data.createdAt).toEqual(new Date('2023-01-02'));
    expect(result.items[3].data.createdAt).toEqual(new Date('2023-01-01'));
    expect(result.items[4].data.createdAt).toEqual(new Date('2023-01-01'));
  });

  it('should handle empty results gracefully', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const fakeMembership = { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() };
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([]);
    mockFetchEvents.mockResolvedValue([]);
    mockFetchShoutouts.mockResolvedValue([]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
  });

  it('should handle API errors gracefully', async () => {
    // Arrange
    mockGetCurrentUser.mockRejectedValue(new Error('API Error'));

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result).toEqual({
      items: [],
      hasMore: false,
    });
  });
});