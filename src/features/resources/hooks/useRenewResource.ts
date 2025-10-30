import { useMutation, useQueryClient } from '@tanstack/react-query';
import { renewResource } from '../api/renewResource';
import { logger, useSupabase } from '@/shared';
import { Resource } from '../types';
import { resourceKeys } from '../queries';
import { feedKeys } from '@/features/feed/queries';

export function useRenewResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation<Resource, Error, string>({
    mutationFn: (resourceId: string) => renewResource(supabase, resourceId),
    onSuccess: (updatedResource: Resource) => {
      // Update the specific resource in cache
      queryClient.setQueryData(
        resourceKeys.detail(updatedResource.id),
        updatedResource,
      );

      // Invalidate resource queries to trigger refetch with updated expiration
      queryClient.invalidateQueries({ queryKey: resourceKeys.lists() });

      // Invalidate feed since renewed resources should appear active in feed
      queryClient.invalidateQueries({ queryKey: feedKeys.all });
    },
    onError: (error: Error) => {
      logger.error('📚 API: Failed to renew resource', { error });
    },
  });
}