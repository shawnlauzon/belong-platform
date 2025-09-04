import type { Database } from '@/shared/types/database';

export type CommunityMemberCodeRow = Database['public']['Tables']['community_member_codes']['Row'];
export type CommunityMemberCodeInsertRow = Database['public']['Tables']['community_member_codes']['Insert'];
export type CommunityMemberCodeUpdateRow = Database['public']['Tables']['community_member_codes']['Update'];

export type UserConnectionRow = Database['public']['Tables']['user_connections']['Row'];
export type UserConnectionInsertRow = Database['public']['Tables']['user_connections']['Insert'];
export type UserConnectionUpdateRow = Database['public']['Tables']['user_connections']['Update'];