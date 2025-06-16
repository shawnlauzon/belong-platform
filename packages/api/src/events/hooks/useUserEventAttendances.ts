import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { EventAttendance } from '@belongnetwork/types';
import { fetchUserEventAttendances } from '../impl/fetchEventAttendees';

export function useUserEventAttendances(userId: string) {
  const result = useQuery<EventAttendance[], Error>({
    queryKey: ['user-events', userId],
    queryFn: () => fetchUserEventAttendances(userId),
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