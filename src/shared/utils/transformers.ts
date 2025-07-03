/**
 * Utility functions for transforming object keys between camelCase and snake_case
 * Used in Zod schemas for automatic database transformations
 */

/**
 * Convert string from camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert string from snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Check if value is an object (but not array or null)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function transformKeysDeep(
  obj: unknown,
  transformer: (key: string) => string
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => transformKeysDeep(item, transformer));
  }

  if (isObject(obj)) {
    const transformed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = transformer(key);
      transformed[newKey] = transformKeysDeep(value, transformer);
    }
    return transformed;
  }

  return obj;
}

export function toRecords(filters: unknown): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(filters ?? {}).map(([key, value]) => [key, value])
  );
}

export const caseTransform = {
  /**
   * Transform object keys from camelCase to snake_case
   * Used when sending data to database
   */
  toSnakeCase: (obj: unknown) => transformKeysDeep(obj, toSnakeCase),

  /**
   * Transform object keys from snake_case to camelCase
   * Used when receiving data from database
   */
  toCamelCase: (obj: unknown) => transformKeysDeep(obj, toCamelCase),
};

/**
 * PostGIS point transformations
 */
export const PointSchema = {
  /**
   * Parse PostGIS POINT string to lat/lng object
   */
  fromPostGIS: (pointString: string) => {
    const match = pointString.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
    if (!match) throw new Error('Invalid PostGIS point format');
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  },

  /**
   * Convert lat/lng object to PostGIS POINT string
   */
  toPostGIS: (point: { lat: number; lng: number }) =>
    `POINT(${point.lng} ${point.lat})`,
};
