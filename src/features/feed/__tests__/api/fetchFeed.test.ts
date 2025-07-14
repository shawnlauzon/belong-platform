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
import { createFakeUser } from '@/features/users/__fakes__';
import { createFakeCommunityMembership, createFakeCommunity } from '@/features/communities/__fakes__';

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

  it('should throw error when user is not authenticated', async () => {
    // Arrange
    mockGetCurrentUser.mockResolvedValue(null);

    // Act & Assert
    await expect(fetchFeed(mockSupabase)).rejects.toThrow('User not authenticated');
    expect(mockGetCurrentUser).toHaveBeenCalledWith(mockSupabase);
    expect(mockFetchUserCommunities).not.toHaveBeenCalled();
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(mockFetchGatherings).not.toHaveBeenCalled();
  });

  it('should return empty feed when user has no communities', async () => {
    // Arrange
    const fakeUser = createFakeUser();
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
    expect(mockFetchUserCommunities).toHaveBeenCalledWith(
      mockSupabase,
      fakeUser.id,
    );
    expect(mockFetchResources).not.toHaveBeenCalled();
    expect(mockFetchGatherings).not.toHaveBeenCalled();
    expect(mockFetchShoutouts).not.toHaveBeenCalled();
  });

  it('should fetch and combine resources, events, and shoutouts from user communities', async () => {
    // Arrange
    const fakeUser = createFakeUser();
    const fakeResource = createFakeResource({ communityId: 'community-1' });
    const fakeGathering = createFakeGathering({ communityId: 'community-1' });
    const fakeShoutout = createFakeShoutout({
      fromUserId: createFakeUser().id,
      toUserId: fakeUser.id,
      resourceId: fakeResource.id,
    });
    const fakeMembership = createFakeCommunityMembership({
      userId: fakeUser.id,
      communityId: fakeResource.communityId,
    });

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
    const types = result.items.map((item) => item.type);
    expect(types).toContain('resource');
    expect(types).toContain('gathering');
    expect(types).toContain('shoutout');

    // Find each item and verify it matches
    const resourceItem = result.items.find((item) => item.type === 'resource');
    const gatheringItem = result.items.find(
      (item) => item.type === 'gathering',
    );
    const shoutoutItem = result.items.find((item) => item.type === 'shoutout');

    expect(resourceItem?.data).toEqual(fakeResource);
    expect(gatheringItem?.data).toEqual(fakeGathering);
    expect(shoutoutItem?.data).toEqual(fakeShoutout);
  });

  it('should sort items by creation date newest first', async () => {
    // Arrange
    const fakeUser = createFakeUser();
    const olderResource = createFakeResource({
      createdAt: new Date('2023-01-01'),
      communityId: 'community-1',
    });
    const newerResource = createFakeResource({
      createdAt: new Date('2023-01-02'),
      communityId: 'community-1',
    });
    const newerEvent = createFakeGathering({
      createdAt: new Date('2023-01-03'),
      communityId: olderResource.communityId,
    });
    const olderEvent = createFakeGathering({
      createdAt: new Date('2023-01-01'),
      communityId: olderResource.communityId,
    });
    const newestShoutout = createFakeShoutout({
      createdAt: new Date('2023-01-04'),
      fromUserId: createFakeUser().id,
      toUserId: fakeUser.id,
      resourceId: olderResource.id,
    });

    const fakeMembership = createFakeCommunityMembership({
      userId: fakeUser.id,
      communityId: olderResource.communityId,
    });

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
    const fakeUser = createFakeUser();
    const fakeMembership = createFakeCommunityMembership({
      userId: fakeUser.id,
    });

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

  it('should throw API errors', async () => {
    // Arrange
    mockGetCurrentUser.mockRejectedValue(new Error('API Error'));

    // Act & Assert
    await expect(fetchFeed(mockSupabase)).rejects.toThrow('API Error');
  });

  it('should only return items from communities where user is a member', async () => {
    // Arrange
    const fakeUser = createFakeUser();

    // User is member of community-1 and community-2, but NOT community-3
    const community1 = createFakeCommunity();
    const community2 = createFakeCommunity();
    const userMemberships = [
      createFakeCommunityMembership({ userId: fakeUser.id, communityId: community1.id }),
      createFakeCommunityMembership({ userId: fakeUser.id, communityId: community2.id }),
    ];

    // Create content in both member and non-member communities
    const resourceFromMemberCommunity = createFakeResource({
      communityId: community1.id,
    });
    const gatheringFromMemberCommunity = createFakeGathering({
      communityId: community2.id,
    });
    const shoutoutFromMemberCommunity = createFakeShoutout({
      fromUserId: createFakeUser().id,
      toUserId: fakeUser.id,
      resourceId: resourceFromMemberCommunity.id,
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
      communityIds: [community1.id, community2.id],
    });
    expect(mockFetchGatherings).toHaveBeenCalledWith(mockSupabase, {
      communityIds: [community1.id, community2.id],
      includePast: false,
    });
    expect(mockFetchShoutouts).toHaveBeenCalledWith(mockSupabase, {
      communityIds: [community1.id, community2.id],
    });

    // Verify only content from member communities is returned
    expect(result.items).toHaveLength(3);
    expect(result.items.find((item) => item.type === 'resource')?.data).toEqual(
      resourceFromMemberCommunity,
    );
    expect(
      result.items.find((item) => item.type === 'gathering')?.data,
    ).toEqual(gatheringFromMemberCommunity);
    expect(result.items.find((item) => item.type === 'shoutout')?.data).toEqual(
      shoutoutFromMemberCommunity,
    );
  });

  it('should include id field in FeedItem that copies the id from associated data object', async () => {
    // Arrange
    const fakeUser = createFakeUser();
    const fakeResource = createFakeResource({
      id: 'resource-123',
      communityId: 'community-1',
    });
    const fakeGathering = createFakeGathering({
      id: 'gathering-456',
      communityId: 'community-1',
    });
    const fakeShoutout = createFakeShoutout({
      id: 'shoutout-789',
      fromUserId: createFakeUser().id,
      toUserId: fakeUser.id,
      resourceId: fakeResource.id,
    });
    const fakeMembership = createFakeCommunityMembership();

    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([fakeResource]);
    mockFetchGatherings.mockResolvedValue([fakeGathering]);
    mockFetchShoutouts.mockResolvedValue([fakeShoutout]);

    // Act
    const result = await fetchFeed(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(3);

    const resourceItem = result.items.find((item) => item.type === 'resource');
    const gatheringItem = result.items.find(
      (item) => item.type === 'gathering',
    );
    const shoutoutItem = result.items.find((item) => item.type === 'shoutout');

    expect(resourceItem?.id).toBe('resource-123');
    expect(gatheringItem?.id).toBe('gathering-456');
    expect(shoutoutItem?.id).toBe('shoutout-789');

    // Verify id matches the data object id
    expect(resourceItem?.id).toBe(resourceItem?.data.id);
    expect(gatheringItem?.id).toBe(gatheringItem?.data.id);
    expect(shoutoutItem?.id).toBe(shoutoutItem?.data.id);
  });
});
