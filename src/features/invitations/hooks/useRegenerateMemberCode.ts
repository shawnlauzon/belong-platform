import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { regenerateInvitationCode } from '../api';
import { invitationKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';

export function useRegenerateMemberCode() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  return useMutation({
    mutationFn: async (communityId: string): Promise<string> => {
      if (!currentUser) {
        throw new Error('User must be authenticated to regenerate invitation code');
      }
      const invitationCode = await regenerateInvitationCode(supabase, currentUser.id, communityId);
      return invitationCode.code;
    },
    onSuccess: (code, communityId) => {
      // Update the cached member code
      const memberCodeKey = invitationKeys.memberCode(communityId);
      queryClient.setQueryData(memberCodeKey, code);
    },
  });
}