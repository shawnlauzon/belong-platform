import { describe, it, expect } from 'vitest';
import { parsePostGisPoint, toPostGisPoint } from '@/shared/utils/postgis';
import {
  forDbInsert,
  toCommunityInfo,
} from '../../transformers/communityTransformer';
import {
  createFakeCommunityData,
  createFakeDbCommunity,
} from '../../__fakes__';
import type { Coordinates } from '@/shared/types';

describe('Coordinate Transformation Pipeline', () => {
  describe('Domain → Database (toPostGisPoint)', () => {
    it('should transform domain coordinates to PostGIS string format', () => {
      const domainCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      const postgisString = toPostGisPoint(domainCoords);

      expect(postgisString).toBe('POINT(-74.006 40.7128)');
      // Note: JavaScript number formatting drops trailing zeros
    });

    it('should handle various coordinate precisions', () => {
      const cases = [
        { input: { lat: 0, lng: 0 }, expected: 'POINT(0 0)' },
        { input: { lat: 90, lng: 180 }, expected: 'POINT(180 90)' },
        { input: { lat: -90, lng: -180 }, expected: 'POINT(-180 -90)' },
        {
          input: { lat: 40.123456, lng: -74.987654 },
          expected: 'POINT(-74.987654 40.123456)',
        },
      ];

      cases.forEach(({ input, expected }) => {
        expect(toPostGisPoint(input)).toBe(expected);
      });
    });
  });

  describe('Database → Domain (parsePostGisPoint)', () => {
    it('should parse GeoJSON Point format returned by PostGIS', () => {
      const geoJsonPoint = {
        type: 'Point',
        crs: { type: 'name', properties: { name: 'EPSG:4326' } },
        coordinates: [-74.006, 40.7128],
      };

      const domainCoords = parsePostGisPoint(geoJsonPoint);

      expect(domainCoords).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
    });

    it('should handle legacy PostGIS string format', () => {
      const postgisString = 'POINT(-74.0060 40.7128)';

      const domainCoords = parsePostGisPoint(postgisString);

      expect(domainCoords).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
    });

    it('should return zero coordinates for invalid input', () => {
      const cases = [null, undefined, '', 'invalid', {}, { invalid: 'data' }];

      cases.forEach((input) => {
        expect(parsePostGisPoint(input)).toEqual({ lat: 0, lng: 0 });
      });
    });
  });

  describe('Round-trip Transformation', () => {
    it('should preserve coordinates through round-trip transformation', () => {
      const originalCoords: Coordinates = { lat: 40.7128, lng: -74.006 };

      // Domain → PostGIS string
      const postgisString = toPostGisPoint(originalCoords);
      expect(postgisString).toBe('POINT(-74.006 40.7128)');

      // PostGIS string → Domain (legacy path)
      const parsedFromString = parsePostGisPoint(postgisString);
      expect(parsedFromString).toEqual({ lat: 40.7128, lng: -74.006 }); // Note precision loss

      // PostGIS GeoJSON → Domain (current path)
      const geoJson = {
        type: 'Point' as const,
        coordinates: [originalCoords.lng, originalCoords.lat],
      };
      const parsedFromGeoJson = parsePostGisPoint(geoJson);
      expect(parsedFromGeoJson).toEqual(originalCoords); // Exact match
    });
  });

  describe('Community Transformer Integration', () => {
    it('should correctly transform center coordinates in forDbInsert', () => {
      const communityData = createFakeCommunityData({
        center: { lat: 40.7128, lng: -74.006 },
      });

      const dbData = forDbInsert({
        ...communityData,
        organizerId: 'test-user-id',
      });

      // Should convert domain coordinates to PostGIS string
      expect(dbData.center).toBe('POINT(-74.006 40.7128)');
    });

    it('should correctly transform center coordinates in toCommunityInfo', () => {
      const dbCommunity = createFakeDbCommunity({
        center: {
          type: 'Point',
          crs: { type: 'name', properties: { name: 'EPSG:4326' } },
          coordinates: [-74.006, 40.7128],
        },
      });

      const communityInfo = toCommunityInfo(dbCommunity);

      // Should convert GeoJSON back to domain coordinates
      expect(communityInfo.center).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
    });

    it('should demonstrate the complete pipeline: Domain → DB → Domain', () => {
      // Start with domain coordinates
      const originalCenter: Coordinates = { lat: 51.5074, lng: -0.1278 }; // London

      // 1. Transform to database format (for insertion)
      const dbInsertData = forDbInsert({
        ...createFakeCommunityData({ center: originalCenter }),
        organizerId: 'test-user',
      });
      expect(dbInsertData.center).toBe('POINT(-0.1278 51.5074)');

      // 2. Simulate database response (what PostGIS returns)
      const dbResponse = createFakeDbCommunity({
        center: {
          type: 'Point',
          crs: { type: 'name', properties: { name: 'EPSG:4326' } },
          coordinates: [originalCenter.lng, originalCenter.lat],
        },
      });

      // 3. Transform back to domain format (from database read)
      const finalCommunityInfo = toCommunityInfo(dbResponse);

      // Should match original coordinates exactly
      expect(finalCommunityInfo.center).toEqual(originalCenter);
    });
  });
});
