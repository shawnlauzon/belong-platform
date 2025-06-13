import { describe, it, expect, vi } from 'vitest';
import { useResourceTransformers } from '../../src/transformers/useResourceTransformers';
import { createMockResource } from '../../src/test-utils';
import {
  parsePostGisPoint,
  toPostGisPoint,
} from '../../src/transformers/utils';
import { resourceDataToDb } from '../../../resource-services/src/transformers/resourceTransformer';
import { renderHook } from '@testing-library/react';
import {
  createMockCommunity,
  createMockDbResource,
  createMockUser,
} from '../../src/test-utils';
import { useBelongStore } from '../../src/stores';
import { BelongState } from '../../src/stores/types';
import { createMockStore } from '../../src/test-utils';

// Mock the current date for consistent testing
const mockDate = new Date('2023-01-01T00:00:00Z');
vi.useFakeTimers();
vi.setSystemTime(mockDate);

// Mock the store
vi.mock('../../src/stores', () => ({
  useBelongStore: vi.fn(),
}));

let mockStore: BelongState;

beforeAll(() => {
  mockStore = createMockStore();
});

// Setup store mock implementation
beforeEach(() => {
  // @ts-expect-error Mock implementation
  useBelongStore.mockImplementation((selector) => selector(mockStore));
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('Resource Transformer', () => {
  describe('toDomainResource', () => {
    it('should transform a database resource to a domain resource', () => {
      // Create a mock owner and resource
      const mockCommunity = createMockCommunity();
      const mockOwner = createMockUser();

      const dbResource = createMockDbResource({
        owner_id: mockOwner.id,
        community_id: mockCommunity.id,
      });

      // Add to store
      mockStore.users.list = [mockOwner];
      mockStore.communities.list = [mockCommunity];

      // Get the transformer function from the hook
      const { result } = renderHook(() => useResourceTransformers());
      const { toDomainResource } = result.current;

      // Call the transformer
      const domainResource = toDomainResource(dbResource);

      // Verify the transformation
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { owner_id, community_id, ...dbResourceWithoutIds } = dbResource;
      expect(domainResource).toMatchObject({
        ...dbResourceWithoutIds,
        location: parsePostGisPoint(dbResource.location),
        owner: mockOwner,
        community: mockCommunity,
        created_at: new Date(dbResource.created_at),
        updated_at: new Date(dbResource.updated_at),
      });
    });
  });

  describe('toDbResource', () => {
    it('should transform a domain resource to a database resource', () => {
      const resource = createMockResource();

      // Get the transformer function from the hook
      const { result } = renderHook(() => useResourceTransformers());
      const { toDbResource } = result.current;

      const dbResource = toDbResource(resource);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { owner, location, ...rest } = resource;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { community, ...restWithoutCommunity } = rest;
      expect(dbResource).toEqual({
        ...restWithoutCommunity,
        owner_id: resource.owner.id,
        community_id: resource.community.id,
        location: resource.location ? toPostGisPoint(resource.location) : null,
        created_at: resource.created_at.toISOString(),
        updated_at: resource.updated_at.toISOString(),
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
        location: resourceData.location
          ? toPostGisPoint(resourceData.location)
          : null,
      });
    });
  });
});
