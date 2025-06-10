import type { Database } from '../types/database';
import type { Community, Coordinates } from '../types/entities';

export type CommunityRow = Database['public']['Tables']['communities']['Row'];

/**
 * Transforms a database community row to a domain Community with hierarchical data
 */
export const toDomainCommunity = (
  dbCommunity: CommunityRow,
  allCommunitiesMap: Map<string, CommunityRow>
): Community => {
  if (!dbCommunity) {
    throw new Error('Database community is required');
  }

  // Get the hierarchical path by traversing parent relationships
  const hierarchyPath = getHierarchyPath(dbCommunity, allCommunitiesMap);

  return {
    id: dbCommunity.id,
    name: dbCommunity.name,
    description: dbCommunity.description,
    member_count: dbCommunity.member_count,
    center: dbCommunity.center ? parsePostGisPoint(dbCommunity.center) : undefined,
    country: hierarchyPath.country || '',
    state: hierarchyPath.state,
    city: hierarchyPath.city || '',
    neighborhood: hierarchyPath.neighborhood,
  };
};

/**
 * Transforms a domain Community to a database insert/update object
 * Note: This doesn't handle the hierarchical fields as they are derived
 */
export const toDbCommunity = (
  community: Partial<Community>
): Partial<Database['public']['Tables']['communities']['Insert']> => {
  const { center, country, state, city, neighborhood, ...rest } = community;

  // Transform Coordinates to PostGIS point
  const dbCenter = center ? toPostGisPoint(center) : undefined;

  // Note: We don't include the hierarchical fields (country, state, city, neighborhood)
  // as they are derived from the parent relationships in the database
  return {
    ...rest,
    center: dbCenter,
  };
};

/**
 * Gets the hierarchical path for a community by traversing parent relationships
 */
function getHierarchyPath(
  community: CommunityRow,
  allCommunitiesMap: Map<string, CommunityRow>
): {
  country?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
} {
  const hierarchy: Record<string, string> = {};
  
  // Start with the current community
  let current = community;
  
  // Add the current community to the hierarchy based on its level
  hierarchy[current.level] = current.name;
  
  // Traverse up the parent chain
  while (current.parent_id) {
    const parent = allCommunitiesMap.get(current.parent_id);
    if (!parent) break;
    
    hierarchy[parent.level] = parent.name;
    current = parent;
  }
  
  return {
    country: hierarchy.country,
    state: hierarchy.state,
    city: hierarchy.city,
    neighborhood: hierarchy.neighborhood,
  };
}

/**
 * Helper to parse PostGIS point to { lat, lng } coordinates
 */
export function parsePostGisPoint(point: unknown): Coordinates {
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
export function toPostGisPoint(coords: Coordinates): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}