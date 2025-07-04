import type {
  CommunityData,
  Community,
  CommunityInfo,
  CommunityMembership,
  CommunityMembershipData,
} from '../types/domain';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { toDomainUser } from '../../users/transformers/userTransformer';
import {
  CommunityInsertDbData,
  CommunityMembershipInsertDbData,
  CommunityMembershipRow,
  CommunityRow,
  CommunityUpdateDbData,
} from '../types/database';
import { ProfileRow } from '../../users/types/database';
import { User } from '~/features/users';

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & {
    organizer: ProfileRow | User;
  }
): Community {
  // Explicitly extract only the fields we need to avoid leaking database properties

  // Check if organizer is already a User (has firstName) or needs to be transformed from ProfileRow
  const organizer =
    'firstName' in dbCommunity.organizer
      ? dbCommunity.organizer
      : toDomainUser(dbCommunity.organizer);

  // Parse PostGIS point to coordinates
  const coords = dbCommunity.center
    ? parsePostGisPoint(dbCommunity.center)
    : undefined;

  return {
    id: dbCommunity.id,
    organizer,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    level: dbCommunity.level ?? undefined,
    memberCount: dbCommunity.member_count,
    radiusKm: dbCommunity.radius_km ?? undefined,
    center: coords,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    deletedAt: dbCommunity.deleted_at
      ? new Date(dbCommunity.deleted_at)
      : undefined,
    deletedBy: dbCommunity.deleted_by ?? undefined,
    parent: undefined,
    parentId: dbCommunity.parent_id,
    hierarchyPath: dbCommunity.hierarchy_path
      ? typeof dbCommunity.hierarchy_path === 'string'
        ? JSON.parse(dbCommunity.hierarchy_path)
        : dbCommunity.hierarchy_path
      : [],
    timeZone: dbCommunity.time_zone,
  };
}

/**
 * Transform a domain community object to a database community record
 */
export function forDbInsert(community: CommunityData): CommunityInsertDbData {
  const {
    organizerId,
    center,
    hierarchyPath,
    parentId,
    timeZone,
    radiusKm,
    boundary,
    memberCount,
    ...rest
  } = community;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: JSON.stringify(hierarchyPath),
    parent_id: parentId,
    time_zone: timeZone,
    radius_km: radiusKm,
    boundary: boundary ? JSON.stringify(boundary) : undefined,
    member_count: memberCount,
  };
}

export function forDbUpdate(
  community: Partial<CommunityData> & { id: string }
): CommunityUpdateDbData {
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    icon: community.icon,
    level: community.level,
    center: community.center ? toPostGisPoint(community.center) : undefined,
    organizer_id: community.organizerId,
    hierarchy_path: community.hierarchyPath
      ? JSON.stringify(community.hierarchyPath)
      : undefined,
    parent_id: community.parentId,
    time_zone: community.timeZone,
    radius_km: community.radiusKm,
    boundary: community.boundary
      ? JSON.stringify(community.boundary)
      : undefined,
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
    community: dbMembership.community
      ? toDomainCommunity(dbMembership.community)
      : undefined,
  };
}

/**
 * Transform a domain membership object to a database membership record for insert
 */
export function forDbMembershipInsert(
  membership: CommunityMembershipData
): CommunityMembershipInsertDbData {
  return {
    user_id: membership.userId,
    community_id: membership.communityId,
    role: membership.role || 'member',
  };
}

/**
 * Transform a database community record to a CommunityInfo object (lightweight for lists)
 */
export function toCommunityInfo(dbCommunity: CommunityRow): CommunityInfo {
  // Parse PostGIS point to coordinates
  const coords = dbCommunity.center
    ? parsePostGisPoint(dbCommunity.center)
    : undefined;

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    memberCount: dbCommunity.member_count,
    radiusKm: dbCommunity.radius_km ?? undefined,
    center: coords,
    level: dbCommunity.level ?? undefined,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    deletedAt: dbCommunity.deleted_at
      ? new Date(dbCommunity.deleted_at)
      : undefined,
    deletedBy: dbCommunity.deleted_by ?? undefined,
    organizerId: dbCommunity.organizer_id,
    parentId: dbCommunity.parent_id,
    hierarchyPath: dbCommunity.hierarchy_path
      ? typeof dbCommunity.hierarchy_path === 'string'
        ? JSON.parse(dbCommunity.hierarchy_path)
        : dbCommunity.hierarchy_path
      : [],
    timeZone: dbCommunity.time_zone,
  };
}
