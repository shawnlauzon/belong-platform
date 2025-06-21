import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { EventInfo, EventFilter } from '@belongnetwork/types';

export function useEvents(filters?: EventFilter) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  const result = useQuery<EventInfo[], Error>({
    queryKey: ['events', filters],
    queryFn: () => eventService.fetchEvents(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useEvents: Error fetching events', { error: result.error });
  }

  return result;
}