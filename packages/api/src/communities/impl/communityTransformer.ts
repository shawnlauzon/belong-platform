import type { Database } from '@belongnetwork/types/database';
import type { CommunityData, Community, CommunityInfo, User, CommunityMembership, CommunityMembershipData } from '@belongnetwork/types';
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
  const { center, created_at, updated_at, deleted_at, deleted_by, is_active, ...rest } = dbCommunity;

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
    isActive: is_active,
    deletedAt: deleted_at ? new Date(deleted_at) : undefined,
    deletedBy: deleted_by ?? undefined,
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
  const { organizerId, center, hierarchyPath, parentId, timeZone, radiusKm, memberCount, ...rest } = community;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: JSON.stringify(hierarchyPath),
    parent_id: parentId,
    time_zone: timeZone,
    radius_km: radiusKm,
    member_count: memberCount,
    is_active: true, // New communities are always active
  };
}

export function forDbUpdate(
  community: Partial<CommunityData> & { id: string }
): CommunityUpdateDbData {
  const { organizerId, center, hierarchyPath, parentId, timeZone, radiusKm, memberCount, ...rest } = community;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: hierarchyPath ? JSON.stringify(hierarchyPath) : undefined,
    parent_id: parentId,
    time_zone: timeZone,
    radius_km: radiusKm,
    member_count: memberCount,
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

/**
 * Transform a database community record to a CommunityInfo object (lightweight for lists)
 */
export function toCommunityInfo(
  dbCommunity: CommunityRow
): CommunityInfo {
  const { center, created_at, updated_at, deleted_at, deleted_by, is_active, organizer_id, parent_id, ...rest } = dbCommunity;

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
    isActive: is_active,
    deletedAt: deleted_at ? new Date(deleted_at) : undefined,
    deletedBy: deleted_by ?? undefined,
    organizerId: organizer_id,
    parentId: parent_id,
    hierarchyPath: dbCommunity.hierarchy_path ? (typeof dbCommunity.hierarchy_path === 'string' ? JSON.parse(dbCommunity.hierarchy_path) : dbCommunity.hierarchy_path) : [],
    timeZone: dbCommunity.time_zone,
  };
}
