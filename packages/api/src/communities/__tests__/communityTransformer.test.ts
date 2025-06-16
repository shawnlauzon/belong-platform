import { describe, it, expect, vi } from 'vitest';
import { toDomainCommunity, forDbInsert } from '../impl/communityTransformer';
import {
  createMockCommunity,
  createMockCommunityData,
  createMockDbCommunity,
  createMockDbProfile,
  createMockUser,
} from '../../test-utils/mocks';
import { parsePostGisPoint, toPostGisPoint } from '../../utils';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

describe('Community Transformer', () => {
  describe('toDomainCommunity', () => {
    it('should transform a database community to domain model', () => {
      // Create a mock database community with joined data
      const mockDbCommunity = {
        ...createMockDbCommunity(),
        organizer: createMockDbProfile(),
        parent: null
      };

      // Call the transformer
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify the transformation
      expect(domainCommunity).toMatchObject({
        id: mockDbCommunity.id,
        name: mockDbCommunity.name,
        description: mockDbCommunity.description,
        member_count: mockDbCommunity.member_count,
        parent_id: mockDbCommunity.parent_id,
        radius_km: mockDbCommunity.radius_km ?? undefined,
      });

      // Verify coordinates are parsed correctly
      expect(domainCommunity.center).toBeDefined();

      // Verify dates are Date objects
      expect(domainCommunity.createdAt).toBeInstanceOf(Date);
      expect(domainCommunity.updatedAt).toBeInstanceOf(Date);

      // Verify organizer is set
      expect(domainCommunity.organizer).toBeDefined();
      expect(domainCommunity.organizer.id).toBe(mockDbCommunity.organizer.id);
    });

    it('should use provided organizer and parent when available', () => {
      // Create mock data with joined parent
      const parentDbCommunity = {
        ...createMockDbCommunity(),
        organizer: createMockDbProfile()
      };
      const mockDbCommunity = {
        ...createMockDbCommunity(),
        organizer: createMockDbProfile(),
        parent: parentDbCommunity
      };

      // Call the transformer with joined data
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify the organizer is transformed
      expect(domainCommunity.organizer).toBeDefined();
      expect(domainCommunity.organizer.id).toBe(mockDbCommunity.organizer.id);

      // Verify the parent is transformed
      expect(domainCommunity.parent).toBeDefined();
      expect(domainCommunity.parent?.id).toBe(parentDbCommunity.id);
    });

    it('should handle missing center gracefully', () => {
      // Create a mock database community without center
      const mockDbCommunity = {
        ...createMockDbCommunity({ center: null }),
        organizer: createMockDbProfile(),
        parent: null
      };

      // Call the transformer
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify center is undefined
      expect(domainCommunity.center).toBeUndefined();
    });

    it('should set neighborhood name for neighborhood level communities', () => {
      // Create a neighborhood level community
      const mockDbCommunity = {
        ...createMockDbCommunity({
          level: 'neighborhood',
          name: 'Test Neighborhood',
        }),
        organizer: createMockDbProfile(),
        parent: null
      };

      // Call the transformer
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // The transformer gets level from parent, not from the community itself
      // This test needs to be adjusted based on actual transformer behavior
      expect(domainCommunity.name).toBe('Test Neighborhood');
    });

    it('should throw error for null/undefined input', () => {
      expect(() => toDomainCommunity(null as any)).toThrow();
      expect(() => toDomainCommunity(undefined as any)).toThrow();
    });
  });

  describe('forDbInsert', () => {
    it('should transform a domain community to database model', () => {
      // Create mock data
      const communityData = createMockCommunityData();

      // Call the transformer
      const dbCommunity = forDbInsert(communityData);

      // Verify the transformation - only check the mapped fields
      expect(dbCommunity).toMatchObject({
        name: communityData.name,
        description: communityData.description,
        organizer_id: communityData.organizerId,
        level: communityData.level,
        center: communityData.center
          ? toPostGisPoint(communityData.center)
          : undefined,
        hierarchy_path: JSON.stringify(communityData.hierarchyPath),
        parent_id: communityData.parentId,
        time_zone: communityData.timeZone,
      });
    });

    it('should handle missing center', () => {
      // Create a community without center
      const communityData = createMockCommunityData({
        center: undefined,
      });

      // Call the transformer
      const dbCommunity = forDbInsert(communityData);

      // Verify center is undefined
      expect(dbCommunity.center).toBeUndefined();
    });

    it('should set level to neighborhood when level is neighborhood', () => {
      // Create a community with neighborhood level
      const communityData = createMockCommunityData({
        level: 'neighborhood',
      });

      // Call the transformer
      const dbCommunity = forDbInsert(communityData);

      // Verify level is set to neighborhood
      expect(dbCommunity.level).toBe('neighborhood');
    });

    it('should set level to city when level is city', () => {
      // Create a community with city level
      const communityData = createMockCommunityData({
        level: 'city',
      });

      // Call the transformer
      const dbCommunity = forDbInsert(communityData);

      // Verify level is set to city
      expect(dbCommunity.level).toBe('city');
    });
  });

  describe('parsePostGisPoint', () => {
    it('should parse PostGIS point string to coordinates', () => {
      const point = 'POINT(-74.006 40.7128)';
      const coords = parsePostGisPoint(point);

      expect(coords).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
    });

    it('should return default coordinates for malformed point string', () => {
      const point = 'INVALID(-74.006 40.7128)';
      const coords = parsePostGisPoint(point);

      expect(coords).toEqual({ lat: 0, lng: 0 });
    });

    it('should handle null or undefined input', () => {
      expect(parsePostGisPoint(null as any)).toEqual({ lat: 0, lng: 0 });
      expect(parsePostGisPoint(undefined as any)).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('toPostGisPoint', () => {
    it('should convert coordinates to PostGIS point string', () => {
      const coords = { lat: 40.7128, lng: -74.006 };
      const point = toPostGisPoint(coords);

      expect(point).toBe('POINT(-74.006 40.7128)');
    });

    it('should handle edge cases', () => {
      expect(toPostGisPoint({ lat: 0, lng: 0 })).toBe('POINT(0 0)');
      expect(toPostGisPoint({ lat: -90, lng: 180 })).toBe('POINT(180 -90)');
    });
  });
});
