import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createEventService } from '../services/event.service';
import type { EventAttendance } from '@belongnetwork/types';

export function useUserEventAttendances(userId: string) {
  const supabase = useSupabase();
  const eventService = createEventService(supabase);
  
  const result = useQuery<EventAttendance[], Error>({
    queryKey: ['user-events', userId],
    queryFn: () => eventService.fetchUserEventAttendances(userId),
    enabled: !!userId,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🎉 useUserEventAttendances: Error fetching user event attendances', { 
      error: result.error,
      userId,
    });
  }

  return result;
}