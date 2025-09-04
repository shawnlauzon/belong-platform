import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { regenerateMemberCode } from '../api';
import { connectionQueries } from '../queries';

export function useRegenerateMemberCode() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string): Promise<string> => {
      const memberCode = await regenerateMemberCode(supabase, communityId);
      return memberCode.code;
    },
    onSuccess: (code, communityId) => {
      // Update the cached member code
      const memberCodeKey = connectionQueries.memberCode(communityId);
      queryClient.setQueryData(memberCodeKey, code);
    },
  });
}