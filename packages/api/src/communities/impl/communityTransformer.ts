import type { Database } from '@belongnetwork/types/database';
import type { CommunityData, Community, User, CommunityMembership, CommunityMembershipData } from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from '../../utils';
import { toDomainUser } from '../../users/impl/userTransformer';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type CommunityInsertDbData =
  Database['public']['Tables']['communities']['Insert'];
export type CommunityUpdateDbData =
  Database['public']['Tables']['communities']['Update'];

// Community membership types
export type CommunityMembershipRow = Database['public']['Tables']['community_memberships']['Row'];
export type CommunityMembershipInsertDbData = Database['public']['Tables']['community_memberships']['Insert'];
export type CommunityMembershipUpdateDbData = Database['public']['Tables']['community_memberships']['Update'];

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & { 
    organizer: ProfileRow | ProfileRow[]; 
  }
): Community {
  const { center, created_at, updated_at, ...rest } = dbCommunity;

  // Parse PostGIS point to coordinates
  const coords = center ? parsePostGisPoint(center) : undefined;


  return {
    ...rest,
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    memberCount: dbCommunity.member_count,
    radiusKm: dbCommunity.radius_km ?? undefined,
    center: coords,
    createdAt: new Date(created_at),
    updatedAt: new Date(updated_at),
    organizer: toDomainUser(Array.isArray(dbCommunity.organizer) ? dbCommunity.organizer[0] : dbCommunity.organizer),
    parent: undefined,
    parentId: dbCommunity.parent_id,
    hierarchyPath: dbCommunity.hierarchy_path ? (typeof dbCommunity.hierarchy_path === 'string' ? JSON.parse(dbCommunity.hierarchy_path) : dbCommunity.hierarchy_path) : [],
    timeZone: dbCommunity.time_zone,
  };
}

/**
 * Transform a domain community object to a database community record
 */
export function forDbInsert(community: CommunityData): CommunityInsertDbData {
  const { organizerId, center, ...rest } = community;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: JSON.stringify(community.hierarchyPath),
    parent_id: community.parentId,
    time_zone: community.timeZone,
  };
}

export function forDbUpdate(
  community: Partial<CommunityData> & { id: string }
): CommunityUpdateDbData {
  const { organizerId, center, ...rest } = community;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: JSON.stringify(community.hierarchyPath),
    parent_id: community.parentId,
    time_zone: community.timeZone,
  };
}

/**
 * Transform a database community membership record to a domain membership object
 */
export function toDomainMembership(
  dbMembership: CommunityMembershipRow & {
    user?: ProfileRow;
    community?: CommunityRow & { organizer: ProfileRow };
  }
): CommunityMembership {
  const { joined_at, user_id, community_id, ...rest } = dbMembership;

  return {
    ...rest,
    userId: user_id,
    communityId: community_id,
    role: dbMembership.role as 'member' | 'admin' | 'organizer' | undefined,
    joinedAt: new Date(joined_at),
    user: dbMembership.user ? toDomainUser(dbMembership.user) : undefined,
    community: dbMembership.community ? toDomainCommunity(dbMembership.community) : undefined,
  };
}

/**
 * Transform a domain membership object to a database membership record for insert
 */
export function forDbMembershipInsert(membership: CommunityMembershipData): CommunityMembershipInsertDbData {
  return {
    user_id: membership.userId,
    community_id: membership.communityId,
    role: membership.role || 'member',
  };
}
