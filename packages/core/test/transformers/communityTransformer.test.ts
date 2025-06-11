import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  toDomainCommunity,
  toDbCommunity,
  parsePostGisPoint,
  toPostGisPoint,
} from '@belongnetwork/core';
import {
  createMockCommunityHierarchy,
  createMockDbCommunity,
} from '@belongnetwork/core/test-utils';
import type { Community } from '@belongnetwork/core';

describe('Community Transformer', () => {
  describe('toDomainCommunity', () => {
    it('should transform a database community to domain model with full hierarchy', () => {
      // Create a mock community hierarchy
      const hierarchy = createMockCommunityHierarchy();
      const communitiesMap = new Map(hierarchy.all.map((c) => [c.id, c]));

      // Transform the neighborhood (lowest level in hierarchy)
      const domainCommunity = toDomainCommunity(
        hierarchy.neighborhood,
        communitiesMap
      );

      // Verify the transformation
      expect(domainCommunity).toMatchObject({
        id: hierarchy.neighborhood.id,
        name: hierarchy.neighborhood.name,
        description: hierarchy.neighborhood.description,
        member_count: hierarchy.neighborhood.member_count,
        country: hierarchy.country.name,
        state: hierarchy.state.name,
        city: hierarchy.city.name,
        neighborhood: hierarchy.neighborhood.name,
      });

      // Verify coordinates are parsed correctly
      expect(domainCommunity.center).toEqual({
        lat: expect.any(Number),
        lng: expect.any(Number),
      });

      // Verify dates are Date objects
      expect(domainCommunity.created_at).toBeInstanceOf(Date);
      expect(domainCommunity.updated_at).toBeInstanceOf(Date);
    });

    it('should handle top-level community (country) correctly', () => {
      const country = createMockDbCommunity({
        name: 'Test Country',
        parent_id: null,
      });

      const domainCommunity = toDomainCommunity(
        country,
        new Map([[country.id, country]])
      );

      expect(domainCommunity).toMatchObject({
        name: 'Test Country',
        country: 'Test Country',
        state: undefined,
        city: '',
        neighborhood: undefined,
      });
    });

    it('should handle missing parent in hierarchy gracefully', () => {
      const orphaned = createMockDbCommunity({
        name: 'Orphaned Community',
        parent_id: 'non-existent-parent',
      });

      const domainCommunity = toDomainCommunity(
        orphaned,
        new Map([[orphaned.id, orphaned]])
      );

      expect(domainCommunity).toMatchObject({
        name: 'Orphaned Community',
        country: '',
        state: undefined,
        city: '',
        neighborhood: undefined,
      });
    });
  });

  describe('toDbCommunity', () => {
    it('should transform domain community to database format', () => {
      const domainCommunity: Partial<Community> = {
        id: 'test-id',
        name: 'Test Community',
        description: 'Test Description',
        member_count: 100,
        center: { lat: 40.7128, lng: -74.006 },
        created_at: new Date(),
        updated_at: new Date(),
      };

      const dbCommunity = toDbCommunity(domainCommunity);

      expect(dbCommunity).toMatchObject({
        id: 'test-id',
        name: 'Test Community',
        description: 'Test Description',
        member_count: 100,
        center: 'POINT(-74.006 40.7128)',
      });

      // Should not include hierarchical fields in the database object
      expect(dbCommunity).not.toHaveProperty('country');
      expect(dbCommunity).not.toHaveProperty('state');
      expect(dbCommunity).not.toHaveProperty('city');
      expect(dbCommunity).not.toHaveProperty('neighborhood');
    });

    it('should handle missing center', () => {
      const domainCommunity: Partial<Community> = {
        name: 'No Center Community',
        center: undefined,
      };

      const dbCommunity = toDbCommunity(domainCommunity);

      expect(dbCommunity.center).toBeUndefined();
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
