import { describe, it, expect, vi } from 'vitest';
import { toDomainCommunity, toDbCommunity } from '../impl/communityTransformer';
import {
  createMockCommunity,
  createMockDbCommunity,
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
      // Create a mock database community
      const mockDbCommunity = createMockDbCommunity();

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
      expect(domainCommunity.created_at).toBeInstanceOf(Date);
      expect(domainCommunity.updated_at).toBeInstanceOf(Date);

      // Verify organizer id is set
      expect(domainCommunity.organizer).toMatchObject({
        id: mockDbCommunity.organizer_id,
      });
    });

    it('should use provided organizer and parent when available', () => {
      // Create mock data
      const mockOrganizer = createMockUser();
      const mockParent = createMockCommunity();
      const mockDbCommunity = createMockDbCommunity({
        organizer_id: mockOrganizer.id,
        parent_id: mockParent.id,
      });

      // Call the transformer with organizer and parent
      const domainCommunity = toDomainCommunity(
        mockDbCommunity,
        mockOrganizer,
        mockParent
      );

      // Verify the provided organizer is used
      expect(domainCommunity.organizer).toEqual(mockOrganizer);

      // Verify the parent hierarchy is used
      expect(domainCommunity.country).toBe(mockParent.country);
      expect(domainCommunity.city).toBe(mockParent.city);
      expect(domainCommunity.neighborhood).toBe(mockParent.neighborhood);
    });

    it('should handle missing center gracefully', () => {
      // Create a mock database community without center
      const mockDbCommunity = createMockDbCommunity({
        center: null,
      });

      // Call the transformer
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify center is undefined
      expect(domainCommunity.center).toBeUndefined();
    });

    it('should set neighborhood name for neighborhood level communities', () => {
      // Create a neighborhood level community
      const mockDbCommunity = createMockDbCommunity({
        level: 'neighborhood',
        name: 'Test Neighborhood',
      });

      // Call the transformer
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify neighborhood is set to the community name
      expect(domainCommunity.neighborhood).toBe('Test Neighborhood');
    });

    it('should throw error for null/undefined input', () => {
      expect(() => toDomainCommunity(null as any)).toThrow();
      expect(() => toDomainCommunity(undefined as any)).toThrow();
    });
  });

  describe('toDbCommunity', () => {
    it('should transform a domain community to database model', () => {
      // Create mock data
      const domainCommunity = createMockCommunity();

      // Call the transformer
      const dbCommunity = toDbCommunity(domainCommunity);

      // Verify the transformation
      expect(dbCommunity).toEqual({
        id: domainCommunity.id,
        name: domainCommunity.name,
        description: domainCommunity.description,
        member_count: domainCommunity.member_count,
        parent_id: domainCommunity.parent_id,
        radius_km: domainCommunity.radius_km,
        organizer_id: domainCommunity.organizer.id,
        level: domainCommunity.neighborhood ? 'neighborhood' : 'city',
        center: domainCommunity.center
          ? toPostGisPoint(domainCommunity.center)
          : undefined,
        created_at: domainCommunity.created_at.toISOString(),
        updated_at: domainCommunity.updated_at.toISOString(),
      });
    });

    it('should handle missing center', () => {
      // Create a community without center
      const domainCommunity = createMockCommunity({
        center: undefined,
      });

      // Call the transformer
      const dbCommunity = toDbCommunity(domainCommunity);

      // Verify center is undefined
      expect(dbCommunity.center).toBeUndefined();
    });

    it('should set level to neighborhood when neighborhood is present', () => {
      // Create a community with neighborhood
      const domainCommunity = createMockCommunity({
        neighborhood: 'Test Neighborhood',
      });

      // Call the transformer
      const dbCommunity = toDbCommunity(domainCommunity);

      // Verify level is set to neighborhood
      expect(dbCommunity.level).toBe('neighborhood');
    });

    it('should set level to city when neighborhood is null', () => {
      // Create a community without neighborhood
      const domainCommunity = createMockCommunity({
        neighborhood: null,
      });

      // Call the transformer
      const dbCommunity = toDbCommunity(domainCommunity);

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
