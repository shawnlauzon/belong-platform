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
import type {
  CommunityBoundary,
  CircularBoundary,
  IsochroneBoundary,
} from '../types/domain';
import { isCircularBoundary } from '../types';

/**
 * Transform a domain boundary object to database format with snake_case field names
 */
function boundaryForDatabase(boundary: CommunityBoundary): any {
  if (boundary.type === 'circular') {
    const circularBoundary = boundary as CircularBoundary;
    return {
      type: circularBoundary.type,
      center: circularBoundary.center,
      radiusKm: circularBoundary.radiusKm,
    };
  } else if (boundary.type === 'isochrone') {
    const isochroneBoundary = boundary as IsochroneBoundary;
    return {
      type: isochroneBoundary.type,
      center: isochroneBoundary.center,
      travelMode: isochroneBoundary.travelMode,
      travelTimeMin: isochroneBoundary.travelTimeMin,
      polygon: isochroneBoundary.polygon,
      areaSqKm: isochroneBoundary.areaSqKm,
    };
  }
  console.log('boundaryForDatabase');
  return boundary;
}

/**
 * Transform database boundary format to domain format with camelCase field names
 */
function boundaryFromDatabase(dbBoundary: any): CommunityBoundary | undefined {
  console.log('boundaryFromDatabase', dbBoundary);
  if (!dbBoundary || typeof dbBoundary !== 'object') {
    return undefined;
  }

  if (dbBoundary.type === 'circular') {
    return {
      type: 'circular',
      center: dbBoundary.center,
      radiusKm: dbBoundary.radiusKm,
    } as CircularBoundary;
  } else if (dbBoundary.type === 'isochrone') {
    return {
      type: 'isochrone',
      center: dbBoundary.center,
      travelMode: dbBoundary.travelMode,
      travelTimeMin: dbBoundary.minutes,
      polygon: dbBoundary.polygon,
      areaSqKm: dbBoundary.area,
    } as IsochroneBoundary;
  }

  return undefined;
}

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & {
    organizer: ProfileRow | User;
  },
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
    parent: undefined,
    parentId: dbCommunity.parent_id,
    hierarchyPath: dbCommunity.hierarchy_path
      ? typeof dbCommunity.hierarchy_path === 'string'
        ? JSON.parse(dbCommunity.hierarchy_path)
        : dbCommunity.hierarchy_path
      : [],
    timeZone: dbCommunity.time_zone,
    boundary: dbCommunity.boundary
      ? JSON.parse(JSON.stringify(dbCommunity.boundary))
      : undefined,
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
    memberCount,
    boundary,
    ...rest
  } = community;

  const boundaryGeometry = boundary
    ? !isCircularBoundary(boundary)
      ? boundary.polygon
      : undefined
    : undefined;

  return {
    ...rest,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: hierarchyPath
      ? JSON.stringify(hierarchyPath)
      : JSON.stringify([]),
    parent_id: parentId,
    time_zone: timeZone,
    radius_km: radiusKm,
    member_count: memberCount,
    boundary: boundary ? boundaryForDatabase(boundary) : undefined,
    boundary_geometry: boundaryGeometry,
    boundary_geometry_detailed: boundaryGeometry,
  };
}

export function forDbUpdate(
  community: Partial<CommunityData> & { id: string },
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
      ? JSON.stringify(boundaryForDatabase(community.boundary))
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
  },
): CommunityMembership {
  const { joined_at, user_id, community_id, ...rest } = dbMembership;

  console.log('dbMembership', dbMembership);

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
    boundaryGeometry: dbMembership.community?.boundary
      ? boundaryFromDatabase(dbMembership.community.boundary)
      : undefined,
    boundaryGeometryDetailed: dbMembership.community?.boundary
      ? boundaryFromDatabase(dbMembership.community.boundary)
      : undefined,
  };
}

/**
 * Transform a domain membership object to a database membership record for insert
 */
export function forDbMembershipInsert(
  membership: CommunityMembershipData,
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

  // Parse boundary JSON
  const boundary = dbCommunity.boundary
    ? boundaryFromDatabase(
        typeof dbCommunity.boundary === 'string'
          ? JSON.parse(dbCommunity.boundary)
          : dbCommunity.boundary,
      )
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
    organizerId: dbCommunity.organizer_id,
    parentId: dbCommunity.parent_id,
    hierarchyPath: dbCommunity.hierarchy_path
      ? typeof dbCommunity.hierarchy_path === 'string'
        ? JSON.parse(dbCommunity.hierarchy_path)
        : dbCommunity.hierarchy_path
      : [],
    timeZone: dbCommunity.time_zone,
    boundary,
  };
}
