import type {
  CommunityData,
  Community,
  CommunityInfo,
  CommunityMembership,
  CommunityMembershipData,
  CommunityBoundary,
  IsochroneBoundary,
  CommunityMembershipInfo,
} from '../types';
import { toDomainUser } from '../../users/transformers/userTransformer';
import {
  CommunityInsertDbData,
  CommunityMembershipInsertDbData,
  CommunityMembershipRow,
  CommunityRow,
  CommunityUpdateDbData,
} from '../types/database';
import { User } from '../../users';

/**
 * Transform a domain boundary object to database format with snake_case field names
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boundaryForDatabase(boundary: CommunityBoundary): any {
  if (boundary.type === 'isochrone') {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function boundaryFromDatabase(dbBoundary: any): CommunityBoundary | undefined {
  console.log('boundaryFromDatabase', dbBoundary);
  if (!dbBoundary || typeof dbBoundary !== 'object') {
    return undefined;
  }

  if (dbBoundary.type === 'isochrone') {
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
    organizer: User;
  },
): Community {
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
export function forDbInsert(community: CommunityData): CommunityInsertDbData {
  const { organizerId, timeZone, memberCount, boundary, ...rest } = community;

  const boundaryGeometry = boundary ? boundary.polygon : undefined;

  return {
    ...rest,
    organizer_id: organizerId,
    time_zone: timeZone,
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
    organizer_id: community.organizerId,
    time_zone: community.timeZone,
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
    user: User;
    community: Community;
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
    role: dbMembership.role as 'member' | 'admin' | 'organizer' | undefined,
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
    role: membership.role || 'member',
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
    memberCount: dbCommunity.member_count,
    createdAt: new Date(dbCommunity.created_at),
    updatedAt: new Date(dbCommunity.updated_at),
    organizerId: dbCommunity.organizer_id,
    timeZone: dbCommunity.time_zone,
    boundary,
  };
}
