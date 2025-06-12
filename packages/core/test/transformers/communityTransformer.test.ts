import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  parsePostGisPoint,
  toPostGisPoint,
} from '../../src/transformers/utils';
import {
  createMockCommunity,
  createMockDbCommunity,
} from '../../src/test-utils';
import { useCommunityTransformers } from '../../src/transformers/useCommunityTransformers';
import { useBelongStore } from '../../src/stores';
import { BelongState } from '../../src/stores/types';
import { createMockStore } from '../../src/test-utils';
import { createMockUser } from '../../src/test-utils';

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

describe('Community Transformer', () => {
  describe('toDomainCommunity', () => {
    it('should transform a database community to domain model', () => {
      // Create a mock community; when to database is transformed, it
      // looks for the parent community in the store
      const mockParentCommunity = createMockCommunity({
        neighborhood: null,
      });
      const mockCreator = createMockUser();

      const mockDbCommunity = createMockDbCommunity({
        parent_id: mockParentCommunity.id,
        creator_id: mockCreator.id,
      });

      // Add mock data to the store
      mockStore.communities.list = [mockParentCommunity];
      mockStore.users.list = [mockCreator];

      // Get the transformer function from the hook
      const { result } = renderHook(() => useCommunityTransformers());
      const { toDomainCommunity } = result.current;

      // Transform the neighborhood (lowest level in hierarchy)
      const domainCommunity = toDomainCommunity(mockDbCommunity);

      // Verify the transformation
      expect(domainCommunity).toMatchObject({
        id: mockDbCommunity.id,
        creator: mockCreator,
        name: mockDbCommunity.name,
        description: mockDbCommunity.description,
        member_count: mockDbCommunity.member_count,
        country: mockParentCommunity.country,
        city: mockParentCommunity.city,
        neighborhood: mockParentCommunity.neighborhood,
      });

      // Verify coordinates are parsed correctly
      expect(domainCommunity.center).toBeDefined();

      // Verify dates are Date objects
      expect(domainCommunity.created_at).toBeInstanceOf(Date);
      expect(domainCommunity.updated_at).toBeInstanceOf(Date);
    });

    // it('should handle top-level community (country) correctly', () => {
    //   // Create a country community
    //   const countryData = createMockDbCommunity({ level: 'country' });
    //   const mockCountry: Community = {
    //     ...countryData,
    //     country: countryData.name,
    //     city: '',
    //     neighborhood: null,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     center: { lat: 0, lng: 0 },
    //     parent_id: '',
    //     creator: createMockUser(),
    //     radius_km: 5,
    //   };

    //   // Add to store
    //   mockStore.communities.list = [mockCountry];

    //   // Get transformer
    //   const { result } = renderHook(() => useCommunityTransformers());
    //   const { toDomainCommunity } = result.current;

    //   // Transform
    //   const domainCommunity = toDomainCommunity(countryData);

    //   // Verify
    //   expect(domainCommunity).toMatchObject({
    //     id: mockCountry.id,
    //     name: mockCountry.name,
    //     description: mockCountry.description,
    //     member_count: mockCountry.member_count,
    //     country: mockCountry.country,
    //     city: '',
    //     neighborhood: null,
    //   });
    // });

    // it('should handle missing parent in hierarchy gracefully', () => {
    //   const orphaned = createMockDbCommunity({
    //     name: 'Orphaned Community',
    //     parent_id: 'non-existent-parent',
    //   });

    //   const domainCommunity = toDomainCommunity(orphaned);

    //   expect(domainCommunity).toMatchObject({
    //     name: 'Orphaned Community',
    //     country: '',
    //     state: undefined,
    //     city: '',
    //     neighborhood: undefined,
    //   });
    // });

    // it('should handle missing optional fields gracefully', () => {
    //   // Create minimal community data
    //   const minimalDbCommunity = createMockDbCommunity({
    //     description: undefined,
    //     member_count: 0,
    //   });

    //   // Create full community object with defaults
    //   const mockCommunity: Community = {
    //     ...minimalDbCommunity,
    //     description: '',
    //     member_count: 0,
    //     country: 'Test Country',
    //     city: 'Test City',
    //     neighborhood: undefined,
    //     created_at: new Date(),
    //     updated_at: new Date(),
    //     center: { lat: 0, lng: 0 },
    //     parent_id: 'test-parent-id',
    //     creator_id: 'test-creator-id',
    //     radius_km: 5
    //   };

    //   // Add to store
    //   mockStore.communities.list = [mockCommunity];

    //   // Get transformer
    //   const { result } = renderHook(() => useCommunityTransformers());
    //   const { toDomainCommunity } = result.current;

    //   // Transform
    //   const domainCommunity = toDomainCommunity(minimalDbCommunity);

    //   // Verify
    //   expect(domainCommunity).toMatchObject({
    //     id: mockCommunity.id,
    //     name: mockCommunity.name,
    //     description: '',
    //     member_count: 0,
    //     country: mockCommunity.country,
    //     city: mockCommunity.city,
    //     neighborhood: null
    //   });
    // });
  });

  describe('toDbCommunity', () => {
    it('should transform a domain community to database model', () => {
      // Create mock data
      const domainCommunity = createMockCommunity();

      // Get transformer
      const { result } = renderHook(() => useCommunityTransformers());
      const { toDbCommunity } = result.current;

      // Transform
      const dbCommunity = toDbCommunity(domainCommunity);

      // Verify
      expect(dbCommunity).toEqual({
        id: domainCommunity.id,
        level: 'neighborhood',
        name: domainCommunity.name,
        description: domainCommunity.description,
        member_count: domainCommunity.member_count,
        parent_id: domainCommunity.parent_id,
        creator_id: domainCommunity.creator.id,
        radius_km: domainCommunity.radius_km,
        center: domainCommunity.center
          ? toPostGisPoint(domainCommunity.center)
          : undefined,
        created_at: domainCommunity.created_at.toISOString(),
        updated_at: domainCommunity.updated_at.toISOString(),
      });
    });

    // it('should handle missing center', () => {
    //   const domainCommunity: Partial<Community> = {
    //     name: 'No Center Community',
    //     center: undefined,
    //   };

    //   const dbCommunity = toDbCommunity(domainCommunity);

    //   expect(dbCommunity.center).toBeUndefined();
    // });
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
