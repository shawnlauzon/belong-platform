import { ProfileRow } from '@/features/users/types/profileRow';
import { CommunityRow } from '@/features/communities/types/communityRow';
import { ResourceRow } from '@/features/resources/types/resourceRow';
import type { Database } from '../../../shared/types/database';

// export const SELECT_SHOUTOUT_WITH_RELATIONS = `
//     id,
//     message,
//     image_urls,
//     created_at,
//     updated_at,
//     from_user_id,
//     to_user_id,
//     resource_id,
//     community_id,
//     from_user:profiles!from_user_id(id, user_metadata),
//     to_user:profiles!to_user_id(id, user_metadata),
//     resource:resources!resource_id(id, title, description, owner:profiles!owner_id(id, user_metadata)),
//     community:communities!community_id(id, name)
//   ` as const;

export const SELECT_SHOUTOUT_WITH_RELATIONS = `
    *,
    from_user:profiles!from_user_id(*),
    to_user:profiles!to_user_id(*),
    resource:resources!resource_id(*,owner:profiles!owner_id(*)),
    community:communities!community_id(*)
  `;

export type ShoutoutRowWithRelations = ShoutoutRow & {
  from_user: ProfileRow;
  to_user: ProfileRow;
  resource: ResourceRow & { owner: ProfileRow };
  community: CommunityRow;
};

export type ShoutoutRow = Database['public']['Tables']['shoutouts']['Row'];
export type ShoutoutInsertRow =
  Database['public']['Tables']['shoutouts']['Insert'];
export type ShoutoutUpdateRow =
  Database['public']['Tables']['shoutouts']['Update'];
