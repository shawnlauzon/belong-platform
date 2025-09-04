import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { regenerateInvitationCode } from '../api';
import { connectionQueries } from '../queries';

export function useRegenerateMemberCode() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (communityId: string): Promise<string> => {
      const invitationCode = await regenerateInvitationCode(supabase, communityId);
      return invitationCode.code;
    },
    onSuccess: (code, communityId) => {
      // Update the cached member code
      const memberCodeKey = connectionQueries.memberCode(communityId);
      queryClient.setQueryData(memberCodeKey, code);
    },
  });
}