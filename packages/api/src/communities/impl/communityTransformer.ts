import type { CommunityData, Database } from '@belongnetwork/types';
import type { Community, User } from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from '../../utils';
import { toDomainUser } from '../../users/impl/userTransformer';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type CommunityInsertDbData =
  Database['public']['Tables']['communities']['Insert'];
export type CommunityUpdateDbData =
  Database['public']['Tables']['communities']['Update'];

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow & { 
    organizer: ProfileRow; 
    parent?: CommunityRow & { organizer: ProfileRow } | null;
  }
): Community {
  const { center, created_at, updated_at, ...rest } = dbCommunity;

  // Parse PostGIS point to coordinates
  const coords = center ? parsePostGisPoint(center) : undefined;

  // Transform parent community if present
  const parent = dbCommunity.parent ? toDomainCommunity(dbCommunity.parent) : undefined;

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
    organizer: toDomainUser(dbCommunity.organizer),
    parent,
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
