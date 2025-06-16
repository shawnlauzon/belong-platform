import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Event, EventFilter } from '@belongnetwork/types';
import { fetchEvents } from '../impl/fetchEvents';

export function useEvents(filters?: EventFilter) {
  const result = useQuery<Event[], Error>({
    queryKey: ['events', filters],
    queryFn: () => fetchEvents(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useEvents: Error fetching events', { error: result.error });
  }

  return result;
}