import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useSupabase } from '../../../shared/hooks';
import { fetchConversation } from '../api';
import { conversationKeys } from '../queries';
import type { CommunityChat } from '../types';

export function useCommunityConversation(
  communityId: string,
  options?: Partial<UseQueryOptions<CommunityChat, Error>>,
) {
  const client = useSupabase();

  return useQuery({
    queryKey: conversationKeys.detail(`community-${communityId}`),
    queryFn: () => fetchConversation(client, `community-${communityId}`) as Promise<CommunityChat>,
    enabled: !!client && !!communityId,
    ...options,
  });
}