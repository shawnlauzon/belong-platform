import type { Database } from '../../../shared/types/database';

// export const SELECT_SHOUTOUT_BASIC = `
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

export const SELECT_SHOUTOUT_BASIC = `*`;

export type ShoutoutRowBasic = ShoutoutRow;

export type ShoutoutRow = Database['public']['Tables']['shoutouts']['Row'];
export type ShoutoutInsertRow =
  Database['public']['Tables']['shoutouts']['Insert'];
export type ShoutoutUpdateRow =
  Database['public']['Tables']['shoutouts']['Update'];
