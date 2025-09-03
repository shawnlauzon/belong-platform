import type { Database } from '@/shared/types/database';

export type NotificationRow =
  Database['public']['Tables']['notifications']['Row'];
export type NotificationInsertDbData =
  Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdateDbData =
  Database['public']['Tables']['notifications']['Update'];

// Join with public_profiles for actor information
export interface NotificationRowJoinActor extends NotificationRow {
  actor?: {
    id: string;
    full_name: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

export const SELECT_NOTIFICATIONS_JOIN_ACTOR = `
  *,
  actor:public_profiles!notifications_actor_id_fkey (
    id,
    full_name,
    first_name,
    last_name,
    avatar_url
  )
`;
