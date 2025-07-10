import type {
  CommunityData,
  CommunityDetail,
  CommunityInfo,
  CommunityMembershipData,
  CommunityBoundary,
  IsochroneBoundary,
  CommunityMembershipInfo,
  CommunityType,
} from '../types';
import { toDomainUser } from '../../users/transformers/userTransformer';
import {
  CommunityInsertDbData,
  CommunityMembershipInsertDbData,
  CommunityMembershipRow,
  CommunityRow,
  CommunityUpdateDbData,
} from '../types/database';
import { UserDetail } from '../../users';
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
 * Transform database boundary format to domain format with camelCase field names
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boundaryFromDatabase(dbBoundary: any): CommunityBoundary | undefined {
  if (!dbBoundary || typeof dbBoundary !== 'object') {
    return undefined;
  }

  if (dbBoundary.type === 'isochrone') {
    return {
      type: 'isochrone',
      travelMode: dbBoundary.travelMode,
      travelTimeMin: dbBoundary.travelTimeMin,
      polygon: dbBoundary.polygon,
      areaSqKm: dbBoundary.areaSqKm,
    } as IsochroneBoundary;
  }

  return undefined;
}

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & {
    organizer: UserDetail;
  },
): CommunityDetail {
  // Explicitly extract only the fields we need to avoid leaking database properties

  // Check if organizer is already a User (has firstName) or needs to be transformed from ProfileRow
  const organizer =
    'firstName' in dbCommunity.organizer
      ? dbCommunity.organizer
      : toDomainUser(dbCommunity.organizer);

  return {
    id: dbCommunity.id,
    organizer,
    name: dbCommunity.name,
    description: dbCommunity.description ?? undefined,
    icon: dbCommunity.icon ?? undefined,
    bannerImageUrl: dbCommunity.banner_image_url ?? undefined,
    type: dbCommunity.type as CommunityType,
    center: parsePostGisPoint(dbCommunity.center),
    memberCount: dbCommunity.member_count,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    timeZone: dbCommunity.time_zone,
    boundary: dbCommunity.boundary
      ? JSON.parse(JSON.stringify(dbCommunity.boundary))
      : undefined,
  };
}

/**
 * Transform a domain community object to a database community record
 */
export function forDbInsert(
  community: CommunityData & { organizerId: string },
): CommunityInsertDbData {
  const {
    timeZone,
    memberCount,
    boundary,
    center,
    organizerId,
    bannerImageUrl,
    type,
    ...rest
  } = community;

  const boundaryGeometry = boundary ? boundary.polygon : undefined;

  return {
    ...rest,
    type,
    organizer_id: organizerId,
    banner_image_url: bannerImageUrl,
    time_zone: timeZone,
    member_count: memberCount,
    center: toPostGisPoint(center),
    boundary: boundary ? boundaryForDatabase(boundary) : undefined,
    boundary_geometry: boundaryGeometry,
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
    banner_image_url: community.bannerImageUrl,
    type: community.type,
    time_zone: community.timeZone,
    center: community.center ? toPostGisPoint(community.center) : undefined,
    boundary: community.boundary
      ? JSON.stringify(boundaryForDatabase(community.boundary))
      : undefined,
  };
}

/**
 * Transform a database community membership record to a domain membership object
 */
export function toDomainMembershipInfo(
  dbMembership: CommunityMembershipRow,
): CommunityMembershipInfo {
  const { joined_at, user_id, community_id, ...rest } = dbMembership;

  return {
    ...rest,
    userId: user_id,
    communityId: community_id,
    joinedAt: new Date(joined_at),
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
  };
}

/**
 * Transform a database community record to a CommunityInfo object (lightweight for lists)
 */
export function toCommunityInfo(dbCommunity: CommunityRow): CommunityInfo {
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
    bannerImageUrl: dbCommunity.banner_image_url ?? undefined,
    type: dbCommunity.type as CommunityType,
    center: parsePostGisPoint(dbCommunity.center),
    memberCount: dbCommunity.member_count,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    organizerId: dbCommunity.organizer_id,
    timeZone: dbCommunity.time_zone,
    boundary,
  };
}
