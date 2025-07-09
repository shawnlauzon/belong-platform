import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFeed } from '../../hooks/useFeed';
import { createMockSupabase } from '../../../../test-utils';
import { createFakeResourceInfo } from '../../../resources/__fakes__';
import { createFakeEventInfo } from '../../../events/__fakes__';
import { createFakeShoutoutInfo } from '../../../shoutouts/__fakes__';
import { createDefaultTestWrapper } from '../../../../test-utils/testWrapper';

// Mock the API functions
vi.mock('../../../auth/api', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('../../../communities/api', () => ({
  fetchUserCommunities: vi.fn(),
}));

vi.mock('../../../resources/api', () => ({
  fetchResources: vi.fn(),
}));

vi.mock('../../../events/api', () => ({
  fetchEvents: vi.fn(),
}));

vi.mock('../../../shoutouts/api', () => ({
  fetchShoutouts: vi.fn(),
}));

import { useSupabase } from '../../../../shared';
import { getCurrentUser } from '../../../auth/api';
import { fetchUserCommunities } from '../../../communities/api';
import { fetchResources } from '../../../resources/api';
import { fetchEvents } from '../../../events/api';
import { fetchShoutouts } from '../../../shoutouts/api';
import { createFakeUserDetail } from '@/features/users/__fakes__';

const mockUseSupabase = vi.mocked(useSupabase);
const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockFetchUserCommunities = vi.mocked(fetchUserCommunities);
const mockFetchResources = vi.mocked(fetchResources);
const mockFetchEvents = vi.mocked(fetchEvents);
const mockFetchShoutouts = vi.mocked(fetchShoutouts);

describe('useFeed', () => {
  let wrapper: ReturnType<typeof createDefaultTestWrapper>['wrapper'];
  let mockSupabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = createMockSupabase({});
    mockUseSupabase.mockReturnValue(mockSupabase);
    ({ wrapper } = createDefaultTestWrapper());
  });

  it('should return FeedInfo from combined resources and events', async () => {
    // Arrange
    const fakeUser = createFakeUserDetail({
      id: 'user-1',
      email: 'test@example.com',
    });
    const fakeResourceInfo = createFakeResourceInfo({
      communityId: 'community-1',
    });
    const fakeEventInfo = createFakeEventInfo({ communityId: 'community-1' });
    const fakeMembership = {
      userId: 'user-1',
      communityId: 'community-1',
      joinedAt: new Date(),
    };

    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([fakeResourceInfo]);
    mockFetchEvents.mockResolvedValue([fakeEventInfo]);
    mockFetchShoutouts.mockResolvedValue([]);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.items).toHaveLength(2);
    });

    expect(result.current.data?.items).toEqual(
      expect.arrayContaining([
        {
          type: 'resource',
          data: fakeResourceInfo,
        },
        {
          type: 'event',
          data: fakeEventInfo,
        },
      ]),
    );
  });

  it('should handle loading state', async () => {
    // Arrange
    mockGetCurrentUser.mockImplementation(() => new Promise(() => {})); // Never resolves

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should handle error state', async () => {
    // Arrange
    const error = new Error('API Error');
    mockGetCurrentUser.mockRejectedValue(error);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [], hasMore: false });
    });
  });

  it('should handle empty feed', async () => {
    // Arrange
    const fakeUser = { id: 'user-1', email: 'test@example.com' };

    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([]); // No communities

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toEqual({ items: [], hasMore: false });
    });
    expect(result.current.data?.items).toHaveLength(0);
  });

  it('should include shoutouts in the feed', async () => {
    // Arrange
    const fakeUser = createFakeUserDetail({
      id: 'user-1',
      email: 'test@example.com',
    });
    const fakeShoutoutInfo = createFakeShoutoutInfo({
      fromUserId: 'user-2',
      toUserId: 'user-1',
      resourceId: 'resource-1',
    });
    const fakeMembership = {
      userId: 'user-1',
      communityId: 'community-1',
      joinedAt: new Date(),
    };

    mockGetCurrentUser.mockResolvedValue(fakeUser);
    mockFetchUserCommunities.mockResolvedValue([fakeMembership]);
    mockFetchResources.mockResolvedValue([]);
    mockFetchEvents.mockResolvedValue([]);
    mockFetchShoutouts.mockResolvedValue([fakeShoutoutInfo]);

    // Act
    const { result } = renderHook(() => useFeed(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.items).toHaveLength(1);
    });

    expect(result.current.data?.items[0]).toEqual({
      type: 'shoutout',
      data: fakeShoutoutInfo,
    });
  });
});
