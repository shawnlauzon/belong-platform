import { ProfileRow } from '@/features/users/types/profileRow';
import { CommunityRow } from '@/features/communities/types/communityRow';
import { Database } from '@/shared/types/database';

export const SELECT_GATHERING_WITH_RELATIONS = `
    *,
    organizer:profiles!organizer_id(*),
    community:communities!community_id(*)
  `;
export type GatheringRowWithRelations = GatheringRow & {
  organizer: ProfileRow;
  community: CommunityRow;
};

export type GatheringRow = Database['public']['Tables']['gatherings']['Row'];
export type GatheringInsertRow =
  Database['public']['Tables']['gatherings']['Insert'];
export type GatheringUpdateRow =
  Database['public']['Tables']['gatherings']['Update'];

export type GatheringResponseRow =
  Database['public']['Tables']['gathering_responses']['Row'];
export type GatheringResponseInsertRow =
  Database['public']['Tables']['gathering_responses']['Insert'];
export type GatheringResponseUpdateRow =
  Database['public']['Tables']['gathering_responses']['Update'];
