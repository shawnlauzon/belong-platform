import type {
  Community,
  CommunityInput,
  CommunityMembershipInput,
  CommunityBoundary,
  IsochroneBoundary,
  CommunityType,
  CommunityMembership,
  CommunityMembershipRole,
} from '../types';
import {
  CommunityInsertRow,
  CommunityMembershipInsertRow,
  CommunityMembershipRow,
  CommunityRow,
  CommunityUpdateRow,
} from '../types/communityRow';
import {
  parsePostGisPoint,
  toPostGisPoint,
} from '../../../shared/utils/postgis';

/**
 * Transform a domain boundary object to database format with snake_case field names
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boundaryForDatabase(boundary: CommunityBoundary): any {
  if (boundary.type === 'isochrone') {
    const isochroneBoundary = boundary as IsochroneBoundary;
    return {
      type: isochroneBoundary.type,
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
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(dbCommunity: CommunityRow): Community {
  // Explicitly extract only the fields we need to avoid leaking database properties

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    bannerImageUrl: dbCommunity.banner_image_url ?? undefined,
    type: dbCommunity.type as CommunityType,
    center: dbCommunity.center ? parsePostGisPoint(dbCommunity.center) : undefined,
    centerName: dbCommunity.center_name ?? undefined,
    memberCount: dbCommunity.member_count,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    timeZone: dbCommunity.time_zone ?? undefined,
    color: dbCommunity.color ?? undefined,
    boundary: dbCommunity.boundary
      ? JSON.parse(JSON.stringify(dbCommunity.boundary))
      : undefined,
  };
}

/**
 * Transform a domain community object to a database community record
 */
export function toCommunityInsertRow(
  community: CommunityInput,
): CommunityInsertRow {
  const {
    timeZone,
    boundary,
    center,
    centerName,
    bannerImageUrl,
    type,
    ...rest
  } = community;

  const boundaryGeometry = boundary ? boundary.polygon : undefined;

  // Virtual communities have null location data
  if (type === 'virtual') {
    return {
      ...rest,
      type,
      banner_image_url: bannerImageUrl,
      time_zone: null,
      member_count: 0,
      center: null,
      center_name: null,
      boundary: null,
      boundary_geometry: null,
    };
  }

  // Non-virtual communities require location data
  return {
    ...rest,
    type,
    banner_image_url: bannerImageUrl,
    time_zone: timeZone!,
    member_count: 0, // Default for new communities
    center: toPostGisPoint(center!),
    center_name: centerName,
    boundary: boundary ? boundaryForDatabase(boundary) : undefined,
    boundary_geometry: boundaryGeometry,
  };
}

export function toCommunityUpdateRow(
  community: Partial<CommunityInput> & { id: string },
): CommunityUpdateRow {
  const boundaryGeometry = community.boundary
    ? community.boundary.polygon
    : undefined;

  // Note: We don't allow changing to/from virtual via this function
  // That is prevented by database trigger
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    icon: community.icon,
    banner_image_url: community.bannerImageUrl,
    type: community.type,
    time_zone: community.timeZone,
    center: community.center ? toPostGisPoint(community.center) : undefined,
    center_name: community.centerName,
    color: community.color,
    boundary: community.boundary
      ? boundaryForDatabase(community.boundary)
      : undefined,
    boundary_geometry: boundaryGeometry,
  };
}

/**
 * Transform a database community membership record to a domain membership object
 */
export function toDomainMembershipInfo(
  dbMembership: CommunityMembershipRow,
): CommunityMembership {
  return {
    userId: dbMembership.user_id,
    communityId: dbMembership.community_id,
    role: dbMembership.role as CommunityMembershipRole,
    createdAt: new Date(dbMembership.created_at),
    updatedAt: new Date(dbMembership.updated_at || dbMembership.created_at),
  };
}

/**
 * Transform a domain membership object to a database membership record for insert
 */
export function toCommunityMembershipInsertRow(
  membership: CommunityMembershipInput,
): CommunityMembershipInsertRow {
  return {
    user_id: membership.userId,
    community_id: membership.communityId,
    role: membership.role || 'member',
  };
}
