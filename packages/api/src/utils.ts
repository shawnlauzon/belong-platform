// Helper functions (these would be imported from a helpers file in a real implementation)
export function parsePostGisPoint(point: unknown): {
  lat: number;
  lng: number;
} {
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

export function toPostGisPoint(coords: { lat: number; lng: number }): string {
  return `POINT(${coords.lng} ${coords.lat})`;
}
