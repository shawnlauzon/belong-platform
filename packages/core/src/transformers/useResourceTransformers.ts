import type { ResourceRow } from './transformers.types';
import type {
  Resource,
  Coordinates,
  ResourceCategory,
  MeetupFlexibility,
} from '../types/entities';
import { useBelongStore } from '../stores';
import { logger } from '../utils';

type ResourceType = 'offer' | 'request';

export function useResourceTransformers() {
  const users = useBelongStore((state) => state.users.list);
  const communities = useBelongStore((state) => state.communities.list);

  const toDomainResource = (dbResource: ResourceRow): Resource => {
    if (!dbResource) {
      throw new Error('Database resource is required');
    }

    const {
      owner_id,
      location,
      community_id,
      created_at,
      updated_at,
      type,
      ...rest
    } = dbResource;
    const coords = location ? parsePostGisPoint(location) : { lat: 0, lng: 0 };

    // get owner from belong store
    const owner = users.find((user) => user.id === owner_id);
    if (!owner) {
      logger.error(`Owner ${owner_id} not found`);
      logger.info(`users: ${JSON.stringify(users, null, 2)}`);
      throw new Error(`Owner ${owner_id} not found`);
    }
    const community = communities.find(
      (community) => community.id === community_id
    );
    if (!community) {
      logger.error(`Community ${community_id} not found`);
      logger.info(`communities: ${JSON.stringify(communities, null, 2)}`);
      throw new Error(`Community ${community_id} not found`);
    }

    return {
      ...rest,
      type: type as ResourceType, // Ensure type is one of the allowed values
      location: coords,
      owner,
      community,
      availability: rest.availability || undefined,
      category: rest.category as ResourceCategory,
      meetup_flexibility: rest.meetup_flexibility as MeetupFlexibility,
      parking_info: rest.parking_info ?? undefined,
      pickup_instructions: rest.pickup_instructions ?? undefined,
      is_active: rest.is_active,
      created_at: new Date(created_at),
      updated_at: new Date(updated_at),
    };
  };

  const toDbResource = (resource: Partial<Resource>): Partial<ResourceRow> => {
    const { owner, community, ...rest } = resource;
    const dbLocation = resource.location
      ? toPostGisPoint(resource.location)
      : null;

    return {
      ...rest,
      availability: rest.availability || undefined,
      category: rest.category || undefined,
      community_id: community?.id,
      description: rest.description || undefined,
      image_urls: rest.image_urls || [],
      is_active: rest.is_active,
      location: dbLocation,
      owner_id: owner?.id,
      meetup_flexibility: rest.meetup_flexibility || null,
      parking_info: rest.parking_info || null,
      pickup_instructions: rest.pickup_instructions || null,
      title: rest.title,
      type: rest.type,
      created_at: rest.created_at?.toISOString(),
      updated_at: rest.updated_at?.toISOString(),
    };
  };

  return { toDomainResource, toDbResource };
}

// Helper functions (would be in a separate file in a real implementation)
function parsePostGisPoint(point: unknown): Coordinates {
  if (!point) return { lat: 0, lng: 0 };

  if (typeof point === 'string') {
    const match = point.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  if (typeof point === 'object' && point !== null) {
    const coords = point as Record<string, unknown>;
    if ('x' in coords && 'y' in coords) {
      return {
        lng: Number(coords.x) || 0,
        lat: Number(coords.y) || 0,
      };
    }
    if ('lng' in coords && 'lat' in coords) {
      return {
        lng: Number(coords.lng) || 0,
        lat: Number(coords.lat) || 0,
      };
    }
  }

  return { lat: 0, lng: 0 };
}

function toPostGisPoint(coords: Coordinates): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}
