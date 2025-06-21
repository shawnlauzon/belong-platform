import { useQuery } from '@tanstack/react-query';
import { logger } from '@belongnetwork/core';
import { useSupabase } from '../../auth/providers/CurrentUserProvider';
import { createThanksService } from '../services/thanks.service';
import type { Thanks } from '@belongnetwork/types';

export function useThankById(id: string) {
  const supabase = useSupabase();
  const thanksService = createThanksService(supabase);
  
  const result = useQuery<Thanks | null, Error>({
    queryKey: ['thanks', { id }],
    queryFn: () => thanksService.fetchThanksById(id),
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