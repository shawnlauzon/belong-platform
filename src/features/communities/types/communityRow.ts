import type { Database } from '../../../shared/types/database';

export const SELECT_COMMUNITY_BASIC = `
    *
  `;

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type CommunityInsertRow =
  Database['public']['Tables']['communities']['Insert'];
export type CommunityUpdateRow =
  Database['public']['Tables']['communities']['Update'];

export type CommunityMembershipRow =
  Database['public']['Tables']['community_memberships']['Row'];
export type CommunityMembershipInsertRow =
  Database['public']['Tables']['community_memberships']['Insert'];
export type CommunityMembershipUpdateRow =
  Database['public']['Tables']['community_memberships']['Update'];
