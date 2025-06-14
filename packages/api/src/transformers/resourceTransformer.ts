import type {
  Community,
  Database,
  MeetupFlexibility,
  ResourceCategory,
  User,
} from '@belongnetwork/types';
import type { Resource } from '@belongnetwork/types';
import { parsePostGisPoint, toPostGisPoint } from './utils';

export type ResourceRow = Database['public']['Tables']['resources']['Row'];

// Error message constants
const ERROR_MESSAGES = {
  /** Error thrown when database resource parameter is null or undefined */
  DATABASE_RESOURCE_REQUIRED: 'Database resource is required',
} as const;

/**
 * Transform a database resource record to a domain resource object
 */
export function toDomainResource(
  dbResource: ResourceRow & { owner?: any; community?: any }
): Resource {
  if (!dbResource) {
    throw new Error(ERROR_MESSAGES.DATABASE_RESOURCE_REQUIRED);
  }

  const { creator_id, community_id, location, created_at, updated_at, ...rest } =
    dbResource;

  // Parse PostGIS point to coordinates
  const coords = location ? parsePostGisPoint(location) : undefined;

  // Extract owner from joined data or create placeholder
  const owner = (
    dbResource.owner
      ? {
          id: dbResource.owner.id,
          email: dbResource.owner.email,
          first_name: dbResource.owner.user_metadata?.first_name || '',
          last_name: dbResource.owner.user_metadata?.last_name || '',
          full_name: dbResource.owner.user_metadata?.full_name || '',
          avatar_url: dbResource.owner.user_metadata?.avatar_url,
          created_at: new Date(dbResource.owner.created_at || Date.now()),
          updated_at: new Date(dbResource.owner.updated_at || Date.now()),
        }
      : {
          id: creator_id || 'unknown',
          email: 'unknown@example.com',
          first_name: 'Unknown',
          last_name: 'User',
          full_name: 'Unknown User',
          avatar_url: undefined,
          created_at: new Date(),
          updated_at: new Date(),
        }
  ) as User;

  // Extract community from joined data or create placeholder
  const community = (
    dbResource.community
      ? {
          id: dbResource.community.id,
          name: dbResource.community.name,
          description: dbResource.community.description,
          member_count: dbResource.community.member_count,
          country: 'United States',
          city: 'Default City',
          neighborhood: null,
          created_at: new Date(dbResource.community.created_at),
          updated_at: new Date(dbResource.community.updated_at),
          parent_id: 'default',
          radius_km: undefined,
          center: dbResource.community.center ? parsePostGisPoint(dbResource.community.center) : undefined,
          organizer: owner, // Use the resource owner as placeholder organizer
        }
      : {
          id: community_id || 'default',
          name: 'Default Community',
          description: 'Default community',
          member_count: 0,
          country: 'United States',
          city: 'Default City',
          neighborhood: null,
          created_at: new Date(),
          updated_at: new Date(),
          parent_id: 'default',
          radius_km: undefined,
          center: undefined,
          organizer: owner,
        }
  ) as Community;

  return {
    ...rest,
    id: dbResource.id,
    type: dbResource.type as 'offer' | 'request',
    category: dbResource.category as ResourceCategory,
    title: dbResource.title,
    description: dbResource.description,
    community_id: community_id || 'default',
    image_urls: dbResource.image_urls || [],
    location: coords,
    pickup_instructions: dbResource.pickup_instructions || undefined,
    parking_info: dbResource.parking_info || undefined,
    meetup_flexibility: dbResource.meetup_flexibility as MeetupFlexibility,
    availability: dbResource.availability || undefined,
    is_active: dbResource.is_active,
    created_at: new Date(created_at),
    updated_at: new Date(updated_at),
    community,
    owner,
  };
}

/**
 * Transform a domain resource object to a database resource record
 */
export function toDbResource(
  resource: Partial<Resource>
): Partial<ResourceRow> {
  const { owner, community, location, ...rest } = resource;

  return {
    ...rest,
    creator_id: owner?.id,
    community_id: community?.id || resource.community_id,
    location: location ? toPostGisPoint(location) : null,
    created_at: resource.created_at?.toISOString(),
    updated_at: resource.updated_at?.toISOString(),
  };
}