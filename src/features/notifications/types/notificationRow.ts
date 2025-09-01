import type { Database } from '@/shared/types/database';

export type NotificationRow = Database['public']['Tables']['notifications']['Row'];
export type NotificationInsertDbData = Database['public']['Tables']['notifications']['Insert'];
export type NotificationUpdateDbData = Database['public']['Tables']['notifications']['Update'];

// Join with public_profiles for actor information
export interface NotificationRowJoinActor extends NotificationRow {
  actor_profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export const SELECT_NOTIFICATIONS_JOIN_ACTOR = `
  *,
  actor_profile:public_profiles!actor_id (
    full_name,
    avatar_url
  )
`;