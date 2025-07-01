/**
 * PostGIS utility functions for spatial data handling
 */

/**
 * Parses a PostGIS point string or object into coordinates
 */
export function parsePostGisPoint(point: unknown): {
  lat: number;
  lng: number;
} {
  if (!point) return { lat: 0, lng: 0 };

  if (typeof point === "string") {
    const match = point.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (match) {
      return {
        lng: parseFloat(match[1]),
        lat: parseFloat(match[2]),
      };
    }
  }

  if (typeof point === "object" && point !== null) {
    const coords = point as Record<string, unknown>;
    if ("x" in coords && "y" in coords) {
      return {
        lng: Number(coords.x) || 0,
        lat: Number(coords.y) || 0,
      };
    }
    if ("lng" in coords && "lat" in coords) {
      return {
        lng: Number(coords.lng) || 0,
        lat: Number(coords.lat) || 0,
      };
    }
  }

  return { lat: 0, lng: 0 };
}

/**
 * Converts coordinates to PostGIS point string format
 */
export function toPostGisPoint(coords: { lat: number; lng: number }): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}