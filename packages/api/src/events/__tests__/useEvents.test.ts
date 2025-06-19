import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { EventInfo } from '@belongnetwork/types';
import { fetchEvents } from '../impl/fetchEvents';
import { useEvents } from '../hooks/useEvents';

// Mock the implementation
vi.mock('../impl/fetchEvents', () => ({
  fetchEvents: vi.fn(),
}));

const mockFetchEvents = vi.mocked(fetchEvents);

describe('useEvents', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should return EventInfo[] instead of Event[]', async () => {
    // Arrange: Mock return value should be EventInfo[]
    const mockEventInfo: EventInfo[] = [
      {
        id: 'event-1',
        title: 'Community BBQ',
        description: 'Join us for a summer BBQ',
        organizerId: 'user-1', // ID instead of User object
        communityId: 'community-1', // ID instead of Community object
        startDateTime: new Date('2024-07-15T18:00:00Z'),
        location: 'Central Park',
        coordinates: { lat: 40.7829, lng: -73.9654 },
        attendeeCount: 25,
        registrationRequired: false,
        isActive: true,
        tags: ['food', 'social'],
        imageUrls: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockEventInfo);
    expect(mockFetchEvents).toHaveBeenCalledWith(undefined);
    
    // Verify the returned data has ID references, not full objects
    const event = result.current.data![0];
    expect(typeof event.organizerId).toBe('string');
    expect(typeof event.communityId).toBe('string');
    expect(event).not.toHaveProperty('organizer');
    expect(event).not.toHaveProperty('community');
  });

  it('should pass filters to fetchEvents and return EventInfo[]', async () => {
    // Arrange
    const filters = { communityId: 'community-1' };
    const mockEventInfo: EventInfo[] = [];
    mockFetchEvents.mockResolvedValue(mockEventInfo);

    // Act
    const { result } = renderHook(() => useEvents(filters), { wrapper });

    // Assert
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockFetchEvents).toHaveBeenCalledWith(filters);
    expect(result.current.data).toEqual(mockEventInfo);
  });
});