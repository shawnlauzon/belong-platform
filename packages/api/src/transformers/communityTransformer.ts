import type { Database } from '@belongnetwork/types';
import type { Community, User } from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from './utils';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];

// Error message constants
const ERROR_MESSAGES = {
  /** Error thrown when database community parameter is null or undefined */
  DATABASE_COMMUNITY_REQUIRED: 'Database community is required',
} as const;

/**
 * Transform a database community record to a domain community object
 */
export function toDomainCommunity(
  dbCommunity: CommunityRow,
  organizer?: User,
  parent?: Community
): Community {
  if (!dbCommunity) {
    throw new Error(ERROR_MESSAGES.DATABASE_COMMUNITY_REQUIRED);
  }

  const { organizer_id, parent_id, center, created_at, updated_at, ...rest } =
    dbCommunity;

  // Parse PostGIS point to coordinates
  const coords = center ? parsePostGisPoint(center) : undefined;

  // Use provided organizer or create placeholder
  const communityOrganizer = organizer || {
    id: organizer_id || 'unknown',
    email: 'unknown@example.com',
    first_name: 'Unknown',
    last_name: 'Organizer',
    full_name: 'Unknown Organizer',
    avatar_url: undefined,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // Use provided parent or create placeholder hierarchy
  const hierarchy = parent
    ? {
        country: parent.country,
        state: parent.state,
        city: parent.city,
        neighborhood: parent.neighborhood,
      }
    : {
        country: 'Unknown Country',
        state: undefined,
        city: 'Unknown City',
        neighborhood:
          dbCommunity.level === 'neighborhood' ? dbCommunity.name : null,
      };

  return {
    ...rest,
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description,
    member_count: dbCommunity.member_count,
    parent_id: dbCommunity.parent_id || undefined,
    radius_km: dbCommunity.radius_km || undefined,
    center: coords,
    created_at: new Date(created_at),
    updated_at: new Date(updated_at),
    organizer: communityOrganizer,
    ...hierarchy,
  } as Community;
}

/**
 * Transform a domain community object to a database community record
 */
export function toDbCommunity(community: Community): Partial<CommunityRow> {
  const { organizer, country, state, city, neighborhood, center, ...rest } =
    community;

  return {
    ...rest,
    organizer_id: community.organizer.id,
    level: community.neighborhood ? 'neighborhood' : 'city',
    center: center ? toPostGisPoint(center) : undefined,
    created_at: community.created_at.toISOString(),
    updated_at: community.updated_at.toISOString(),
  };
}
