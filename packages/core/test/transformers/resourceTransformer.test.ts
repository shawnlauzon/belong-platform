import { describe, it, expect, vi } from 'vitest';
import {
  toDomainResource,
  toDbResource,
  parsePostGisPoint,
  toPostGisPoint,
  resourceDataToDb,
} from '@belongnetwork/core';
import {
  createMockResource,
  createMockDbProfile,
  createMockDbResourceWithOwner,
} from '@belongnetwork/core';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      // Create a mock owner and resource
      const dbOwner = createMockDbProfile();
      const dbResource = createMockDbResourceWithOwner(dbOwner);

      // Call the transformer
      const result = toDomainResource(dbResource);

      // Verify the transformation
      expect(result).toMatchObject({
        ...dbResource,
        location: parsePostGisPoint(dbResource.location),
      });
    });
  });

  describe('toDbResource', () => {
    it('should transform a domain resource to a database resource', () => {
      const resource = createMockResource();

      const result = toDbResource(resource);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { owner, location, ...rest } = resource;

      expect(result).toEqual({
        ...rest,
        creator_id: resource.owner.id,
        location: toPostGisPoint(resource.location),
      });
    });
  });

  describe('parsePostGisPoint', () => {
    it('should parse a PostGIS point string', () => {
      const point = 'POINT(-73.935242 40.730610)';
      const result = parsePostGisPoint(point);
      expect(result).toEqual({ lng: -73.935242, lat: 40.73061 });
    });

    it('should parse an object with x,y coordinates', () => {
      const point = { x: -73.935242, y: 40.73061 };
      const result = parsePostGisPoint(point);
      expect(result).toEqual({ lng: -73.935242, lat: 40.73061 });
    });

    it('should parse an object with lng,lat coordinates', () => {
      const point = { lng: -73.935242, lat: 40.73061 };
      const result = parsePostGisPoint(point);
      expect(result).toEqual({ lng: -73.935242, lat: 40.73061 });
    });

    it('should return default coordinates for invalid input', () => {
      expect(parsePostGisPoint(null as any)).toEqual({ lat: 0, lng: 0 });
      expect(parsePostGisPoint('invalid')).toEqual({ lat: 0, lng: 0 });
      expect(parsePostGisPoint({})).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('toPostGisPoint', () => {
    it('should convert coordinates to PostGIS point string', () => {
      const coords = { lng: -73.935242, lat: 40.73061 };
      const result = toPostGisPoint(coords);
      expect(result).toBe('POINT(-73.935242 40.73061)');
    });
  });

  describe('resourceDataToDb', () => {
    it('should transform resource data to database format', () => {
      // Create a resource data object that matches the expected input type
      const resourceData = createMockResource();

      // The function expects a Partial<ResourceData> but we're providing a full ResourceData
      const result = resourceDataToDb(resourceData);

      expect(result).toEqual({
        ...resourceData,
        location: toPostGisPoint(resourceData.location),
      });
    });
  });
});
