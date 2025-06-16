import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Thanks } from '@belongnetwork/types';
import { fetchThanksById } from '../impl/fetchThanks';

export function useThankById(id: string) {
  const result = useQuery<Thanks | null, Error>({
    queryKey: ['thanks', { id }],
    queryFn: () => fetchThanksById(id),
    enabled: !!id,
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🙏 useThankById: Error fetching thanks by ID', { 
      id, 
      error: result.error 
    });
  }

  return result;
}