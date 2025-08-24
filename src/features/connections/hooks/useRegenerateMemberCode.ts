import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { regenerateMemberCode } from '../api';
import { toConnectionLink } from '../transformers';
import { connectionQueries } from '../queries';
import type { ConnectionLink } from '../types';

export function useRegenerateMemberCode(baseUrl?: string) {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string): Promise<ConnectionLink> => {
      const memberCode = await regenerateMemberCode(supabase, communityId);
      return toConnectionLink(memberCode, baseUrl);
    },
    onSuccess: (connectionLink, communityId) => {
      // Update the cached member code
      const memberCodeKey = connectionQueries.memberCode(communityId);
      queryClient.setQueryData(memberCodeKey, connectionLink);
    },
  });
}