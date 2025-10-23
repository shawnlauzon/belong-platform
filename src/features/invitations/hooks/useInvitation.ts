import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getInvitationCode } from '../api';
import { invitationKeys } from '../queries';
import { useCurrentUser } from '@/features/auth';

export function useInvitation(
  communityId: string,
  options?: Partial<UseQueryOptions<string, Error>>
) {
  const supabase = useSupabase();
  const { data: currentUser } = useCurrentUser();

  return useQuery({
    queryKey: invitationKeys.memberCode(communityId),
    queryFn: async (): Promise<string> => {
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      const invitation = await getInvitationCode(supabase, currentUser.id, communityId);
      return invitation.code;
    },
    enabled: !!communityId && !!currentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}