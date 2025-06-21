import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { Event } from '@belongnetwork/types';

export function useEvent(id: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  const result = useQuery<Event | null, Error>({
    queryKey: ['events', id],
    queryFn: () => eventService.fetchEventById(id),
    enabled: !!id,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useEvent: Error fetching event', { error: result.error, id });
  }

  return result;
}