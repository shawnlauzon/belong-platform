import { camelCase, snakeCase, mapKeys, isObject, isArray } from 'lodash';

/**
 * Utility functions for transforming object keys between camelCase and snake_case
 * Used in Zod schemas for automatic database transformations
 */

function transformKeysDeep(obj: any, transformer: (key: string) => string): any {
  if (isArray(obj)) {
    return obj.map(item => transformKeysDeep(item, transformer));
  }
  
  if (isObject(obj) && obj !== null) {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = transformer(key);
      transformed[newKey] = transformKeysDeep(value, transformer);
    }
    return transformed;
  }
  
  return obj;
}

export const caseTransform = {
  /**
   * Transform object keys from camelCase to snake_case
   * Used when sending data to database
   */
  toSnakeCase: (obj: any) => transformKeysDeep(obj, snakeCase),
  
  /**
   * Transform object keys from snake_case to camelCase
   * Used when receiving data from database
   */
  toCamelCase: (obj: any) => transformKeysDeep(obj, camelCase)
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
      lat: parseFloat(match[2]) 
    };
  },
  
  /**
   * Convert lat/lng object to PostGIS POINT string
   */
  toPostGIS: (point: { lat: number; lng: number }) => 
    `POINT(${point.lng} ${point.lat})`
};