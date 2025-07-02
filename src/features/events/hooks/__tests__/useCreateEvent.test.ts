import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCreateEvent } from '../useCreateEvent';
import { createEventService } from '../../services/event.service';
import { logger } from '../../../../shared';
import type { EventData } from '../../types';

// Mock the logger
vi.mock('../../../../shared', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  queryKeys: {
    events: {
      all: ['events'],
      byId: (id: string) => ['event', id],
      byCommunity: (communityId: string) => ['events', 'community', communityId],
      byOrganizer: (organizerId: string) => ['events', 'organizer', organizerId],
    },
  },
  useSupabase: vi.fn(() => ({})),
}));

// Mock the event service
vi.mock('../../services/event.service', () => ({
  createEventService: vi.fn(),
}));

import { useSupabase } from '../../../../shared';

const mockUseSupabase = vi.mocked(useSupabase);
const mockCreateEventService = vi.mocked(createEventService);
const mockCreateEvent = vi.fn();

describe('useCreateEvent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockCreateEventService.mockReturnValue({
      createEvent: mockCreateEvent,
    } as any);

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: any }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should create event and invalidate queries on success', async () => {
    const mockEventData: EventData = {
      title: 'Test Event',
      description: 'Test Description',
      startTime: new Date('2024-04-15T10:00:00'),
      endTime: new Date('2024-04-15T14:00:00'),
      location: { lat: 37.7749, lng: -122.4194 },
      communityId: 'community-123',
      maxAttendees: 20
    };

    const mockCreatedEvent = {
      id: 'event-123',
      ...mockEventData,
      community: { id: 'community-123' },
      organizer: { id: 'user-123' },
    };

    mockCreateEvent.mockResolvedValue(mockCreatedEvent);

    const { result } = renderHook(() => useCreateEvent(), { wrapper });

    await result.current(mockEventData);

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(mockEventData);
      expect(logger.info).toHaveBeenCalledWith(
        '🎉 API: Successfully created event',
        expect.objectContaining({
          id: 'event-123',
          title: 'Test Event',
        })
      );
    });
  });

  it('should log error on failure', async () => {
    const mockError = new Error('Creation failed');
    mockCreateEvent.mockRejectedValue(mockError);

    const { result } = renderHook(() => useCreateEvent(), { wrapper });

    await expect(result.current({ title: 'Test' } as EventData)).rejects.toThrow('Creation failed');

    await waitFor(() => {
      expect(logger.error).toHaveBeenCalledWith(
        '🎉 API: Failed to create event',
        { error: mockError }
      );
    });
  });
});