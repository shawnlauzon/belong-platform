import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import type { Gathering } from '@/features/gatherings/types';
import { fetchAgenda } from '../../api/fetchAgenda';

// Mock external dependencies
vi.mock('@/shared/utils', () => ({
  getAuthIdOrThrow: vi.fn()
}));

vi.mock('@/features/gatherings/api', () => ({
  fetchUpcomingGatheringsForUser: vi.fn(),
  fetchUpcomingOrganizerGatherings: vi.fn(),
  fetchGatheringsNeedingShoutout: vi.fn()
}));

vi.mock('@/features/resources/api', () => ({
  fetchOffersNeedingShoutout: vi.fn(),
  fetchFavorsNeedingShoutout: vi.fn()
}));

// Import mocked functions
const { getAuthIdOrThrow } = await import('@/shared/utils');
const {
  fetchUpcomingGatheringsForUser,
  fetchUpcomingOrganizerGatherings,
  fetchGatheringsNeedingShoutout
} = await import('@/features/gatherings/api');
const {
  fetchOffersNeedingShoutout,
  fetchFavorsNeedingShoutout
} = await import('@/features/resources/api');

describe('fetchAgenda', () => {
  const mockSupabase = {} as SupabaseClient<Database>;
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    vi.mocked(getAuthIdOrThrow).mockResolvedValue(mockUserId);
    vi.mocked(fetchUpcomingGatheringsForUser).mockResolvedValue([]);
    vi.mocked(fetchUpcomingOrganizerGatherings).mockResolvedValue([]);
    vi.mocked(fetchGatheringsNeedingShoutout).mockResolvedValue([]);
    vi.mocked(fetchOffersNeedingShoutout).mockResolvedValue([]);
    vi.mocked(fetchFavorsNeedingShoutout).mockResolvedValue([]);
  });

  it('includes attending gatherings as gathering-confirmed todos', async () => {
    // Arrange
    const attendingGathering: Gathering = {
      id: 'gathering-123',
      title: 'Team Meeting',
      description: 'Weekly sync',
      startDateTime: new Date('2024-12-01T10:00:00Z'),
      endDateTime: new Date('2024-12-01T11:00:00Z'),
      communityId: 'community-1',
      organizerId: 'organizer-1',
      location: 'Office',
      imageUrls: [],
      maxAttendees: null,
      attendeeCount: 1,
      tags: [],
      organizer: {
        id: 'organizer-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        avatar: null
      },
      community: {
        id: 'community-1',
        name: 'Test Community',
        description: 'A test community',
        latitude: 0,
        longitude: 0,
        radius: 5000,
        memberCount: 10,
        imageUrl: null
      }
    };
    
    vi.mocked(fetchUpcomingGatheringsForUser)
      .mockResolvedValueOnce([attendingGathering])  // 'attending' status
      .mockResolvedValueOnce([]);                   // 'maybe' status

    // Act
    const result = await fetchAgenda(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'gathering-yes-gathering-123',
      type: 'gathering-confirmed',
      title: 'Team Meeting',
      description: "You're attending this gathering",
      dueDate: attendingGathering.startDateTime,
      gathering: attendingGathering
    });
    expect(result.hasMore).toBe(false);
  });

  it('includes maybe gatherings as gathering-maybe todos', async () => {
    // Arrange
    const maybeGathering: Gathering = {
      id: 'gathering-456',
      title: 'Maybe Event',
      description: 'Optional event',
      startDateTime: new Date('2024-12-02T14:00:00Z'),
      endDateTime: new Date('2024-12-02T15:00:00Z'),
      communityId: 'community-1',
      organizerId: 'organizer-1',
      location: 'Cafe',
      imageUrls: [],
      maxAttendees: null,
      attendeeCount: 0,
      tags: [],
      organizer: {
        id: 'organizer-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        avatar: null
      },
      community: {
        id: 'community-1',
        name: 'Test Community',
        description: 'A test community',
        latitude: 0,
        longitude: 0,
        radius: 5000,
        memberCount: 10,
        imageUrl: null
      }
    };
    
    vi.mocked(fetchUpcomingGatheringsForUser)
      .mockResolvedValueOnce([])              // 'attending' status
      .mockResolvedValueOnce([maybeGathering]); // 'maybe' status

    // Act
    const result = await fetchAgenda(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      id: 'gathering-maybe-gathering-456',
      type: 'gathering-maybe',
      title: 'Maybe Event',
      description: "You might attend this gathering - confirm your attendance",
      dueDate: maybeGathering.startDateTime,
      gathering: maybeGathering
    });
  });

  it('calls fetchUpcomingGatheringsForUser with correct parameters', async () => {
    // Act
    await fetchAgenda(mockSupabase);

    // Assert
    expect(fetchUpcomingGatheringsForUser).toHaveBeenCalledWith(mockSupabase, mockUserId, 'attending');
    expect(fetchUpcomingGatheringsForUser).toHaveBeenCalledWith(mockSupabase, mockUserId, 'maybe');
  });

  it('handles empty results', async () => {
    // Act
    const result = await fetchAgenda(mockSupabase);

    // Assert
    expect(result.items).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it('handles authentication errors', async () => {
    // Arrange
    vi.mocked(getAuthIdOrThrow).mockRejectedValue(new Error('Not authenticated'));

    // Act & Assert
    await expect(fetchAgenda(mockSupabase)).rejects.toThrow('Not authenticated');
  });
});