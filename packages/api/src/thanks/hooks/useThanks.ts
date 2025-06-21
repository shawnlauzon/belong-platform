import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';
import type { ThanksInfo, ThanksFilter } from '@belongnetwork/types';

export function useThanks(filters?: ThanksFilter) {
  const supabase = useSupabase();
  const thanksService = createThanksService(supabase);
  
  const result = useQuery<ThanksInfo[], Error>({
    queryKey: ['thanks', filters],
    queryFn: () => thanksService.fetchThanks(filters),
  });

  // Handle errors manually since onError is deprecated
  if (result.error) {
    logger.error('🙏 useThanks: Error fetching thanks', { error: result.error });
  }

  return result;
}