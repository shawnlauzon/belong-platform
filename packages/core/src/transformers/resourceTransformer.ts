import type { Database } from '../types/database';
import type { Resource, ResourceData, Coordinates } from '../types/entities';
import { toDomainUser } from './userTransformer';

export type ResourceRow = Omit<Database['public']['Tables']['resources']['Row'], 'times_helped'> & {
  times_helped?: number;
  owner?: Database['public']['Tables']['profiles']['Row'] & {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  };
};

/**
 * Transforms a database resource row to a domain Resource
 */
export const toDomainResource = (dbResource: ResourceRow): Resource => {
  if (!dbResource) {
    throw new Error('Database resource is required');
  }

  const { owner, location, ...rest } = dbResource;
  
  // Transform PostGIS point to Coordinates
  const coords = location ? parsePostGisPoint(location) : { lat: 0, lng: 0 };

  return {
    ...rest,
    location: coords,
    times_helped: 'times_helped' in dbResource ? dbResource.times_helped : 0,
    owner: owner ? toDomainUser(owner) : {
      id: dbResource.creator_id,
      created_at: dbResource.created_at,
      updated_at: dbResource.updated_at,
      email: '',
      user_metadata: null,
    },
  } as Resource;
};

/**
 * Transforms a domain Resource to a database insert/update object
 */
export const toDbResource = (
  resource: Partial<Resource>,
  isUpdate: boolean = false
): Partial<Database['public']['Tables']['resources']['Insert']> => {
  const { owner, location, ...rest } = resource;
  
  // Transform Coordinates to PostGIS point
  const dbLocation = location ? toPostGisPoint(location) : undefined;

  const base = {
    ...rest,
    location: dbLocation,
  };

  // Only include creator_id for new resources
  if (!isUpdate && owner?.id) {
    return {
      ...base,
      creator_id: owner.id,
    };
  }

  return base;
};

/**
 * Helper to parse PostGIS point to { lat, lng } coordinates
 */
function parsePostGisPoint(point: unknown): Coordinates {
  if (!point) return { lat: 0, lng: 0 };
  
  // Handle string format (PostGIS POINT)
  if (typeof point === 'string') {
    const match = point.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }
  
  // Handle object format ({ x, y } or { lng, lat })
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

/**
 * Helper to convert { lat, lng } to PostGIS POINT string
 */
function toPostGisPoint(coords: Coordinates): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}

/**
 * Transforms a domain ResourceData to a database insert object
 */
export const resourceDataToDb = (
  resourceData: Partial<ResourceData>
): Partial<Database['public']['Tables']['resources']['Insert']> => {
  const { location, ...rest } = resourceData;
  
  return {
    ...rest,
    location: location ? toPostGisPoint(location) : undefined,
  };
};
