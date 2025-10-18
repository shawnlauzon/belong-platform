import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '@/shared';
import { getInvitationCode } from '../api';
import { invitationKeys } from '../queries';

export function useInvitation(
  communityId: string,
  options?: Partial<UseQueryOptions<string, Error>>
) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: invitationKeys.memberCode(communityId),
    queryFn: async (): Promise<string> => {
      const invitation = await getInvitationCode(supabase, communityId);
      return invitation.code;
    },
    enabled: !!communityId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}