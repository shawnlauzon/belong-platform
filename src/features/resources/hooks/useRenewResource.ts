import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types/database';
import { renewResource } from '../api/renewResource';

export function useRenewResource(supabase: SupabaseClient<Database>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resourceId: string) => renewResource(supabase, resourceId),
    onSuccess: (_, resourceId) => {
      // Invalidate resource queries to trigger refetch with updated expiration
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resource', resourceId] });
    },
  });
}