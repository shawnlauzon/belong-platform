import type { Database } from '@/shared/types/database';

export type CommunityMemberCodeRow = Database['public']['Tables']['community_member_codes']['Row'];
export type CommunityMemberCodeInsertRow = Database['public']['Tables']['community_member_codes']['Insert'];
export type CommunityMemberCodeUpdateRow = Database['public']['Tables']['community_member_codes']['Update'];

export type ConnectionRequestRow = Database['public']['Tables']['connection_requests']['Row'];
export type ConnectionRequestInsertRow = Database['public']['Tables']['connection_requests']['Insert'];
export type ConnectionRequestUpdateRow = Database['public']['Tables']['connection_requests']['Update'];

export type UserConnectionRow = Database['public']['Tables']['user_connections']['Row'];
export type UserConnectionInsertRow = Database['public']['Tables']['user_connections']['Insert'];
export type UserConnectionUpdateRow = Database['public']['Tables']['user_connections']['Update'];

export type ConnectionRequestStatus = Database['public']['Enums']['connection_request_status'];