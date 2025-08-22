import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renewResource } from '../api/renewResource';
import { logger, useSupabase } from '@/shared';
import { Resource } from '../types';

export function useRenewResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) => renewResource(supabase, resourceId),
    onSuccess: (resource: Resource) => {
      // Invalidate resource queries to trigger refetch with updated expiration
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', resource.id] });
    },
    onError: (error: Error) => {
      logger.error('📚 API: Failed to renew resource', { error });
    },
  });
}