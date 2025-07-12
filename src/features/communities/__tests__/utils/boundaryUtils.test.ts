import { describe, it, expect } from 'vitest';
import {
  validateBoundaryData,
  transformBoundaryToDb,
  transformBoundaryFromDb,
  type BoundaryDbData,
} from '../../utils/boundaryUtils';
import { createFakeCommunityInput } from '../../__fakes__';
import type { IsochroneBoundary } from '../../types/domain';

describe('boundaryUtils', () => {
  describe('validateBoundaryData', () => {
    it('should validate isochrone boundary without center field', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        areaSqKm: 1.5,
      };

      // This should pass - boundary doesn't need center field
      expect(() => validateBoundaryData(boundary)).not.toThrow();
    });

  });

  describe('transformBoundaryToDb', () => {
    it('should transform boundary without including center field', () => {
      const communityData = createFakeCommunityInput();
      const boundary = communityData.boundary!;

      const result = transformBoundaryToDb(boundary);

      // Should include all required fields except center
      expect(result.boundaryJson).toEqual({
        type: 'isochrone',
        travelMode: boundary.travelMode,
        travelTimeMin: boundary.travelTimeMin,
        polygon: boundary.polygon,
        areaSqKm: boundary.areaSqKm,
      });

      // Should NOT include center field
      expect(result.boundaryJson).not.toHaveProperty('center');
    });

    it('should generate WKT geometry from polygon', () => {
      const communityData = createFakeCommunityInput();
      const boundary = communityData.boundary!;

      const result = transformBoundaryToDb(boundary);

      expect(result.boundaryGeometry).toBeDefined();
      expect(result.boundaryGeometry).toMatch(/^POLYGON\(\(.+\)\)$/);
    });
  });

  describe('transformBoundaryFromDb', () => {
    it('should transform boundary from database format', () => {
      const dbData: BoundaryDbData = {
        boundary: {
          type: 'isochrone',
          travelMode: 'walking',
          travelTimeMin: 15,
          polygon: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
          },
          areaSqKm: 1.5,
        },
        boundary_geometry: null,
      };

      const result = transformBoundaryFromDb(dbData);

      expect(result).toEqual({
        type: 'isochrone',
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
        },
        areaSqKm: 1.5,
      });

      // Should not include center field
      expect(result).not.toHaveProperty('center');
    });

    it('should return null for null boundary data', () => {
      const dbData: BoundaryDbData = {
        boundary: null,
        boundary_geometry: null,
      };

      const result = transformBoundaryFromDb(dbData);

      expect(result).toBeNull();
    });
  });
});