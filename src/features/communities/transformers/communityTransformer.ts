import type {
  CommunityData,
  Community,
  CommunityInfo,
  CommunityMembership,
  CommunityMembershipData,
  CommunityBoundary,
} from '../types/domain';
import { parsePostGisPoint, toPostGisPoint } from '../../../shared/utils';
import { toDomainUser } from '../../users/transformers/userTransformer';
import {
  transformBoundaryFromDb,
  transformBoundaryToDb,
} from '../utils/boundaryUtils';
import {
  CommunityInsertDbData,
  CommunityMembershipInsertDbData,
  CommunityMembershipRow,
  CommunityRow,
  CommunityUpdateDbData,
} from '../types/database';
import { ProfileRow } from '../../users/types/database';

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & {
    organizer: ProfileRow | ProfileRow[];
  }
): Community {
  // Explicitly extract only the fields we need to avoid leaking database properties

  // Parse PostGIS point to coordinates (legacy support)
  const coords = dbCommunity.center
    ? parsePostGisPoint(dbCommunity.center)
    : undefined;

  // Transform boundary data from database format
  const boundary = transformBoundaryFromDb({
    boundary: dbCommunity.boundary as CommunityBoundary | null,
    boundary_geometry: dbCommunity.boundary_geometry,
    boundary_geometry_detailed: dbCommunity.boundary_geometry_detailed,
  });

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    level: dbCommunity.level ?? undefined,
    memberCount: dbCommunity.member_count,
    
    // Boundary configuration (new isochrone support)
    boundary: boundary ?? undefined,
    
    // Legacy boundary fields (maintained for backward compatibility)
    radiusKm: dbCommunity.radius_km ?? undefined,
    center: coords,
    
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    deletedAt: dbCommunity.deleted_at
      ? new Date(dbCommunity.deleted_at)
      : undefined,
    deletedBy: dbCommunity.deleted_by ?? undefined,
    organizer: toDomainUser(
      Array.isArray(dbCommunity.organizer)
        ? dbCommunity.organizer[0]
        : dbCommunity.organizer
    ),
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
    memberCount,
    boundary,
    ...rest
  } = community;

  // Handle boundary transformation
  let boundaryData = null;
  let boundaryGeometry = null;
  let boundaryGeometryDetailed = null;

  if (boundary) {
    const boundaryTransform = transformBoundaryToDb(boundary);
    boundaryData = boundaryTransform.boundaryJson;
    boundaryGeometry = boundaryTransform.boundaryGeometry;
    boundaryGeometryDetailed = boundaryTransform.boundaryGeometryDetailed;
  }

  return {
    ...rest,
    boundary: boundaryData as any,
    boundary_geometry: boundaryGeometry,
    boundary_geometry_detailed: boundaryGeometryDetailed,
    center: center ? toPostGisPoint(center) : undefined,
    organizer_id: organizerId,
    hierarchy_path: JSON.stringify(hierarchyPath),
    parent_id: parentId,
    time_zone: timeZone,
    radius_km: radiusKm,
    member_count: memberCount,
  };
}

export function forDbUpdate(
  community: Partial<CommunityData> & { id: string }
): CommunityUpdateDbData {
  // Handle boundary transformation if boundary is provided
  let boundaryData = undefined;
  let boundaryGeometry = undefined;
  let boundaryGeometryDetailed = undefined;

  if (community.boundary !== undefined) {
    if (community.boundary === null) {
      // Explicitly clearing boundary
      boundaryData = null;
      boundaryGeometry = null;
      boundaryGeometryDetailed = null;
    } else {
      // Setting new boundary
      const boundaryTransform = transformBoundaryToDb(community.boundary);
      boundaryData = boundaryTransform.boundaryJson;
      boundaryGeometry = boundaryTransform.boundaryGeometry;
      boundaryGeometryDetailed = boundaryTransform.boundaryGeometryDetailed;
    }
  }

  return {
    id: community.id,
    name: community.name,
    description: community.description,
    icon: community.icon,
    level: community.level,
    boundary: boundaryData as any,
    boundary_geometry: boundaryGeometry,
    boundary_geometry_detailed: boundaryGeometryDetailed,
    center: community.center ? toPostGisPoint(community.center) : undefined,
    organizer_id: community.organizerId,
    hierarchy_path: community.hierarchyPath
      ? JSON.stringify(community.hierarchyPath)
      : undefined,
    parent_id: community.parentId,
    time_zone: community.timeZone,
    radius_km: community.radiusKm,
    member_count: community.memberCount,
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
  // Parse PostGIS point to coordinates (legacy support)
  const coords = dbCommunity.center
    ? parsePostGisPoint(dbCommunity.center)
    : undefined;

  // Transform boundary data from database format
  const boundary = transformBoundaryFromDb({
    boundary: dbCommunity.boundary as CommunityBoundary | null,
    boundary_geometry: dbCommunity.boundary_geometry,
    boundary_geometry_detailed: dbCommunity.boundary_geometry_detailed,
  });

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    memberCount: dbCommunity.member_count,
    
    // Boundary configuration (new isochrone support)
    boundary: boundary ?? undefined,
    
    // Legacy boundary fields (maintained for backward compatibility)
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
