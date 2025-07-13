import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFeed } from '../../api';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResource } from '../../../resources/__fakes__';
import { createFakeGathering } from '../../../gatherings/__fakes__';
import { createFakeShoutout } from '../../../shoutouts/__fakes__';

// Mock the API functions
vi.mock('../../../resources/api', () => ({
  fetchResources: vi.fn(),
}));

vi.mock('../../../gatherings/api', () => ({
  fetchGatherings: vi.fn(),
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
import { fetchGatherings } from '../../../gatherings/api';
import { fetchShoutouts } from '../../../shoutouts/api';
import { fetchUserCommunities } from '../../../communities/api';
import { getCurrentUser } from '../../../auth/api';

const mockFetchResources = vi.mocked(fetchResources);
const mockFetchGatherings = vi.mocked(fetchGatherings);
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
    expect(mockFetchGatherings).not.toHaveBeenCalled();
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
    expect(mockFetchGatherings).not.toHaveBeenCalled();
    expect(mockFetchShoutouts).not.toHaveBeenCalled();
  });

  it('should fetch and combine resources, events, and shoutouts from user communities', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const fakeResource = createFakeResource({ communityId: 'community-1' });
    const fakeGathering = createFakeGathering({ communityId: 'community-1' });
    const fakeShoutout = createFakeShoutout({ 
      fromUserId: 'user-2', 
      toUserId: 'user-1', 
      resourceId: 'resource-1' 
    });
    const fakeMembership = { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() };
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([fakeResource]);
    mockFetchGatherings.mockResolvedValue([fakeGathering]);
    mockFetchShoutouts.mockResolvedValue([fakeShoutout]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(3);
    // Check that all items are present (order may vary due to timestamps)
    const types = result.items.map(item => item.type);
    expect(types).toContain('resource');
    expect(types).toContain('gathering');
    expect(types).toContain('shoutout');
    
    // Find each item and verify it matches
    const resourceItem = result.items.find(item => item.type === 'resource');
    const gatheringItem = result.items.find(item => item.type === 'gathering');
    const shoutoutItem = result.items.find(item => item.type === 'shoutout');
    
    expect(resourceItem?.data).toEqual(fakeResource);
    expect(gatheringItem?.data).toEqual(fakeGathering);
    expect(shoutoutItem?.data).toEqual(fakeShoutout);
  });

  it('should sort items by creation date newest first', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    const olderResource = createFakeResource({ 
      createdAt: new Date('2023-01-01'), 
      communityId: 'community-1' 
    });
    const newerResource = createFakeResource({ 
      createdAt: new Date('2023-01-02'), 
      communityId: 'community-1' 
    });
    const newerEvent = createFakeGathering({ 
      createdAt: new Date('2023-01-03'), 
      communityId: 'community-1' 
    });
    const olderEvent = createFakeGathering({ 
      createdAt: new Date('2023-01-01'), 
      communityId: 'community-1' 
    });
    const newestShoutout = createFakeShoutout({ 
      createdAt: new Date('2023-01-04'), 
      fromUserId: 'user-2', 
      toUserId: 'user-1', 
      resourceId: 'resource-1' 
    });
    
    const fakeMembership = { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() };
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([olderResource, newerResource]);
    mockFetchGatherings.mockResolvedValue([olderEvent, newerEvent]);
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
    mockFetchGatherings.mockResolvedValue([]);
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

  it('should only return items from communities where user is a member', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };
    
    // User is member of community-1 and community-2, but NOT community-3
    const userMemberships = [
      { userId: 'user-1', communityId: 'community-1', joinedAt: new Date() },
      { userId: 'user-1', communityId: 'community-2', joinedAt: new Date() },
    ];
    
    // Create content in both member and non-member communities
    const resourceFromMemberCommunity = createFakeResource({ communityId: 'community-1' });
    const gatheringFromMemberCommunity = createFakeGathering({ communityId: 'community-2' });
    const shoutoutFromMemberCommunity = createFakeShoutout({ 
      fromUserId: 'user-2', 
      toUserId: 'user-1', 
      resourceId: 'resource-1' 
    });
    
    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue(userMemberships);
    mockFetchResources.mockResolvedValue([resourceFromMemberCommunity]);
    mockFetchGatherings.mockResolvedValue([gatheringFromMemberCommunity]);
    mockFetchShoutouts.mockResolvedValue([shoutoutFromMemberCommunity]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    // Verify content fetch functions were called with only member community IDs
    expect(mockFetchResources).toHaveBeenCalledWith(mockSupabase, { 
      communityIds: ['community-1', 'community-2'] 
    });
    expect(mockFetchGatherings).toHaveBeenCalledWith(mockSupabase, { 
      communityIds: ['community-1', 'community-2'],
      includePast: false
    });
    expect(mockFetchShoutouts).toHaveBeenCalledWith(mockSupabase, { 
      communityIds: ['community-1', 'community-2'] 
    });
    
    // Verify only content from member communities is returned
    expect(result.items).toHaveLength(3);
    expect(result.items.find(item => item.type === 'resource')?.data).toEqual(resourceFromMemberCommunity);
    expect(result.items.find(item => item.type === 'gathering')?.data).toEqual(gatheringFromMemberCommunity);
    expect(result.items.find(item => item.type === 'shoutout')?.data).toEqual(shoutoutFromMemberCommunity);
  });
});