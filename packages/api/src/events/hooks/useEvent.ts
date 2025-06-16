import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Event } from '@belongnetwork/types';
import { fetchEventById } from '../impl/fetchEvents';

export function useEvent(id: string) {
  const result = useQuery<Event | null, Error>({
    queryKey: ['events', id],
    queryFn: () => fetchEventById(id),
    enabled: !!id,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useEvent: Error fetching event', { error: result.error, id });
  }

  return result;
}