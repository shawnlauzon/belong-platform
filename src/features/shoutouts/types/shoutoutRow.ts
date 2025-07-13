import { ProfileRow } from '@/features/users/types/profileRow';
import { CommunityRow } from '@/features/communities/types/communityRow';
import { ResourceRow } from '@/features/resources/types/resourceRow';
import { GatheringRow } from '@/features/gatherings/types/gatheringRow';
import type { Database } from '../../../shared/types/database';

export const SELECT_SHOUTOUT_WITH_RELATIONS = `
    *,
    fromUser:profiles!from_user_id(*),
    toUser:profiles!to_user_id(*),
    resource:resources!resource_id(*,owner:profiles!owner_id(*)),
    gathering:gatherings!gathering_id(*,organizer:profiles!organizer_id(*),community:communities!community_id(*)),
    community:communities!community_id(*)
  `;
export type ShoutoutRowWithRelations = ShoutoutRow & {
  fromUser: ProfileRow;
  toUser: ProfileRow;
  resource: (ResourceRow & { owner: ProfileRow }) | null;
  gathering: (GatheringRow & { organizer: ProfileRow; community: CommunityRow }) | null;
  community: CommunityRow;
};

export type ShoutoutRow = Database['public']['Tables']['shoutouts']['Row'];
export type ShoutoutInsertRow =
  Database['public']['Tables']['shoutouts']['Insert'];
export type ShoutoutUpdateRow =
  Database['public']['Tables']['shoutouts']['Update'];
