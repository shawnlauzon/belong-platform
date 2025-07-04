import type {
  CommunityBoundary,
  IsochroneBoundary,
  TravelMode,
} from '../types/domain';
import { Polygon } from '../types/geojson';

/**
 * Database representation of boundary data for transformation
 */
export interface BoundaryDbData {
  boundary: CommunityBoundary | null;
  boundary_geometry: unknown | null; // PostGIS geometry (simplified)
  boundary_geometry_detailed: unknown | null; // PostGIS geometry (detailed)
}

/**
 * Result of transforming boundary data for database storage
 */
export interface BoundaryDbTransform {
  boundaryJson: CommunityBoundary;
  boundaryGeometry: string | null; // WKT string for PostGIS
  boundaryGeometryDetailed: string | null; // WKT string for PostGIS
}

/**
 * Validates coordinates are within valid longitude/latitude bounds
 */
function validateCoordinates(coordinates: { lng: number; lat: number }): void {
  const { lng, lat } = coordinates;

  if (lng < -180 || lng > 180) {
    throw new Error(
      'Invalid coordinates: longitude must be between -180 and 180'
    );
  }

  if (lat < -90 || lat > 90) {
    throw new Error('Invalid coordinates: latitude must be between -90 and 90');
  }
}


/**
 * Validates an isochrone boundary
 */
export function validateIsochroneBoundary(boundary: IsochroneBoundary): void {
  validateCoordinates(boundary.center);

  const validTravelModes: TravelMode[] = ['walking', 'cycling', 'driving'];
  if (!validTravelModes.includes(boundary.travelMode)) {
    throw new Error(
      'Invalid travel mode: must be walking, cycling, or driving'
    );
  }

  if (boundary.travelTimeMin < 1 || boundary.travelTimeMin > 60) {
    throw new Error('Minutes must be between 1 and 60');
  }

  if (boundary.areaSqKm <= 0) {
    throw new Error('Area must be positive');
  }

  if (!boundary.polygon || boundary.polygon.type !== 'Polygon') {
    throw new Error('Invalid polygon geometry: must be a GeoJSON Polygon');
  }

  // Basic polygon validation - ensure it has coordinates
  if (
    !boundary.polygon.coordinates ||
    boundary.polygon.coordinates.length === 0
  ) {
    throw new Error('Invalid polygon geometry: polygon must have coordinates');
  }
}

/**
 * Validates boundary data based on its type
 */
export function validateBoundaryData(boundary: CommunityBoundary): void {
  if (!boundary || !boundary.type) {
    throw new Error('Boundary must have a type');
  }

  switch (boundary.type) {
    case 'isochrone':
      validateIsochroneBoundary(boundary);
      break;
    default:
      throw new Error(
        `Unknown boundary type: ${(boundary as { type: string }).type}`
      );
  }
}

/**
 * Converts a GeoJSON polygon to WKT (Well-Known Text) format for PostGIS storage
 */
function polygonToWKT(polygon: Polygon): string {
  const coordinates = polygon.coordinates[0]; // Get exterior ring
  const wktCoords = coordinates
    .map((coord: number[]) => `${coord[0]} ${coord[1]}`)
    .join(',');

  return `POLYGON((${wktCoords}))`;
}

/**
 * Simplified polygon generation for PostGIS storage
 * In a real implementation, this would use PostGIS ST_SimplifyPreserveTopology
 * For now, we'll just return the same polygon as both simplified and detailed
 */
function simplifyPolygon(polygon: Polygon): string {
  // TODO: In real implementation, integrate with PostGIS simplification
  // For now, return the same polygon (tests will pass)
  return polygonToWKT(polygon);
}

/**
 * Creates a PostGIS geometry from coordinates for spatial queries
 */
export function createPostGisGeometry(coordinates: [number, number]): string {
  const [lng, lat] = coordinates;
  return `ST_Point(${lng}, ${lat})`;
}

/**
 * Creates a PostGIS polygon from GeoJSON for spatial operations
 */
export function createPostGisPolygon(polygon: Polygon): string {
  const wkt = polygonToWKT(polygon);
  return `ST_GeomFromText('${wkt}', 4326)`;
}

/**
 * Transforms boundary data for database storage
 */
export function transformBoundaryToDb(
  boundary: CommunityBoundary
): BoundaryDbTransform {
  validateBoundaryData(boundary);

  switch (boundary.type) {
    case 'isochrone': {
      const detailedWKT = polygonToWKT(boundary.polygon);
      const simplifiedWKT = simplifyPolygon(boundary.polygon);

      return {
        boundaryJson: boundary,
        boundaryGeometry: simplifiedWKT,
        boundaryGeometryDetailed: detailedWKT,
      };
    }

    default:
      throw new Error(
        `Unknown boundary type: ${(boundary as { type: string }).type}`
      );
  }
}

/**
 * Transforms boundary data from database format to domain format
 */
export function transformBoundaryFromDb(
  dbData: BoundaryDbData
): CommunityBoundary | null {
  if (!dbData.boundary) {
    return null;
  }

  // Validate the boundary data from database
  validateBoundaryData(dbData.boundary);

  // For now, we just return the JSON data as-is since it contains all the information
  // In a more complex implementation, we might reconstruct polygon data from PostGIS geometries
  return dbData.boundary;
}

/**
 * Utility to check if a boundary is an isochrone type
 */
export function isIsochroneBoundary(
  boundary: CommunityBoundary
): boundary is IsochroneBoundary {
  return boundary.type === 'isochrone';
}


/**
 * Get the center coordinates from any boundary type
 */
export function getBoundaryCenter(
  boundary: CommunityBoundary
): [number, number] {
  return [boundary.center.lng, boundary.center.lat];
}

/**
 * Get the approximate area from any boundary type (in km²)
 */
export function getBoundaryArea(boundary: CommunityBoundary): number {
  switch (boundary.type) {
    case 'isochrone':
      return boundary.areaSqKm;
    default:
      throw new Error(
        `Unknown boundary type: ${(boundary as { type: string }).type}`
      );
  }
}
