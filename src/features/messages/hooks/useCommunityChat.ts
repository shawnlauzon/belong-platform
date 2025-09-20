import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchCommunityChat } from '../api';
import { conversationKeys } from '../queries';
import type { CommunityChat } from '../types';

export function useCommunityChat(
  communityId: string,
  options?: Partial<UseQueryOptions<CommunityChat, Error>>,
) {
  const client = useSupabase();

  return useQuery({
    queryKey: conversationKeys.communityChat(communityId),
    queryFn: () => fetchCommunityChat(client, communityId),
    enabled: !!client && !!communityId,
    ...options,
  });
}
