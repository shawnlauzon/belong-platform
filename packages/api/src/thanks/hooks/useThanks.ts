import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import type { Thanks, ThanksFilter } from '@belongnetwork/types';
import { fetchThanks } from '../impl/fetchThanks';

export function useThanks(filters?: ThanksFilter) {
  const result = useQuery<Thanks[], Error>({
    queryKey: ['thanks', filters],
    queryFn: () => fetchThanks(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🙏 useThanks: Error fetching thanks', { error: result.error });
  }

  return result;
}