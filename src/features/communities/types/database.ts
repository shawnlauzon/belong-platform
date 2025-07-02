import type { Database } from '../../../shared/types/database';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type CommunityInsertDbData =
  Database['public']['Tables']['communities']['Insert'];
export type CommunityUpdateDbData =
  Database['public']['Tables']['communities']['Update'];

export type CommunityMembershipRow =
  Database['public']['Tables']['community_memberships']['Row'];
export type CommunityMembershipInsertDbData =
  Database['public']['Tables']['community_memberships']['Insert'];
export type CommunityMembershipUpdateDbData =
  Database['public']['Tables']['community_memberships']['Update'];
