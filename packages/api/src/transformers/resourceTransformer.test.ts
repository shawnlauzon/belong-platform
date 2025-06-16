import { describe, it, expect, vi } from 'vitest';
import { toDomainResource, toDbResource } from './resourceTransformer';
import { createMockResource, createMockDbResource } from '../test-utils/mocks';
import { parsePostGisPoint, toPostGisPoint } from '../utils';
import { Community, User } from '@belongnetwork/types';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      // Create a mock database resource with owner data
      const dbResource = createMockDbResource();

      // Call the transformer
      const domainResource = toDomainResource(dbResource);

      // Verify the transformation
      expect(domainResource).toMatchObject({
        id: dbResource.id,
        type: dbResource.type,
        category: dbResource.category,
        title: dbResource.title,
        description: dbResource.description,
        image_urls: dbResource.image_urls,
        location: parsePostGisPoint(dbResource.location),
        pickup_instructions: dbResource.pickup_instructions,
        parking_info: dbResource.parking_info,
        meetup_flexibility: dbResource.meetup_flexibility,
        availability: dbResource.availability,
        is_active: dbResource.is_active,
        created_at: new Date(dbResource.created_at),
        updated_at: new Date(dbResource.updated_at),
      });

      // Verify owner id
      expect(domainResource.owner).toMatchObject({
        id: dbResource.owner_id,
      });

      // Verify community id
      expect(domainResource.community).toMatchObject({
        id: dbResource.community_id,
      });
    });

    it('should handle missing owner data with placeholder', () => {
      // Create a mock database resource without owner data
      const dbResource = createMockDbResource();
      delete (dbResource as any).owner;

      // Call the transformer
      const domainResource = toDomainResource(dbResource);

      // Verify placeholder owner is created
      expect(domainResource.owner).toMatchObject({
        id: dbResource.owner_id,
        email: 'unknown@example.com',
        first_name: 'Unknown',
        last_name: 'User',
        full_name: 'Unknown User',
      });
    });

    it('should handle missing location gracefully', () => {
      // Create a mock database resource without location
      const dbResource = createMockDbResource({
        location: null,
      });

      // Call the transformer
      const domainResource = toDomainResource(dbResource);

      // Verify location is undefined
      expect(domainResource.location).toBeUndefined();
    });

    it('should throw error for null/undefined input', () => {
      expect(() => toDomainResource(null as any)).toThrow();
      expect(() => toDomainResource(undefined as any)).toThrow();
    });
  });

  describe('toDbResource', () => {
    it('should transform a domain resource to a database resource', () => {
      // Create a mock domain resource
      const resource = createMockResource();

      // Call the transformer
      const dbResource = toDbResource(resource);

      // Verify the transformation
      expect(dbResource).toEqual({
        id: resource.id,
        type: resource.type,
        category: resource.category,
        title: resource.title,
        description: resource.description,
        image_urls: resource.imageUrls,
        pickup_instructions: resource.pickupInstructions,
        parking_info: resource.parkingInfo,
        meetup_flexibility: resource.meetupFlexibility,
        availability: resource.availability,
        is_active: resource.isActive,
        owner_id: resource.owner.id,
        community_id: resource.community.id,
        location: resource.location ? toPostGisPoint(resource.location) : null,
        created_at: resource.createdAt.toISOString(),
        updated_at: resource.updatedAt.toISOString(),
      });
    });

    it('should handle partial resource data', () => {
      // Create a partial resource
      const partialResource = {
        id: 'resource-123',
        title: 'Test Resource',
        owner: { id: 'owner-123' } as User,
        community: { id: 'community-123' } as Community,
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z'),
      };

      // Call the transformer
      const dbResource = toDbResource(partialResource);

      // Verify only provided fields are included
      expect(dbResource).toMatchObject({
        id: 'resource-123',
        title: 'Test Resource',
        owner_id: 'owner-123',
        community_id: 'community-123',
        location: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      });
    });

    it('should handle missing location', () => {
      // Create a resource without location
      const resource = createMockResource({
        location: undefined,
      });

      // Call the transformer
      const dbResource = toDbResource(resource);

      // Verify location is null
      expect(dbResource.location).toBeNull();
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
});
