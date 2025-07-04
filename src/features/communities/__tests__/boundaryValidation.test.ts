import { describe, it, expect } from 'vitest';
import {
  validateBoundaryData,
  validateCircularBoundary,
  validateIsochroneBoundary,
  transformBoundaryToDb,
  transformBoundaryFromDb,
} from '../utils/boundaryUtils'; // This doesn't exist yet - we'll create it
import type {
  CommunityBoundary,
  CircularBoundary,
  IsochroneBoundary,
} from '../types/domain';

describe('Boundary Validation', () => {
  describe('validateCircularBoundary', () => {
    it('should validate a correct circular boundary', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: 5.5,
      };

      expect(() => validateCircularBoundary(boundary)).not.toThrow();
    });

    it('should throw error for invalid coordinates', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: 200, lat: 100 }, // Invalid longitude/latitude
        radiusKm: 5.5,
      };

      expect(() => validateCircularBoundary(boundary)).toThrow(
        'Invalid coordinates'
      );
    });

    it('should throw error for negative radius', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: -1,
      };

      expect(() => validateCircularBoundary(boundary)).toThrow(
        'Radius must be positive'
      );
    });

    it('should throw error for zero radius', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: 0,
      };

      expect(() => validateCircularBoundary(boundary)).toThrow(
        'Radius must be positive'
      );
    });
  });

  describe('validateIsochroneBoundary', () => {
    const validPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-97.7531, 30.2772],
          [-97.7331, 30.2772],
          [-97.7331, 30.2572],
          [-97.7531, 30.2572],
          [-97.7531, 30.2772],
        ],
      ],
    };

    it('should validate a correct isochrone boundary', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: validPolygon,
        areaSqKm: 12.5,
      };

      expect(() => validateIsochroneBoundary(boundary)).not.toThrow();
    });

    it('should throw error for invalid travel mode', () => {
      const boundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'flying', // Invalid travel mode
        travelTimeMin: 15,
        polygon: validPolygon,
        areaSqKm: 12.5,
      } as IsochroneBoundary;

      expect(() => validateIsochroneBoundary(boundary)).toThrow(
        'Invalid travel mode'
      );
    });

    it('should throw error for invalid minutes (too low)', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 0,
        polygon: validPolygon,
        areaSqKm: 12.5,
      };

      expect(() => validateIsochroneBoundary(boundary)).toThrow(
        'Minutes must be between 1 and 60'
      );
    });

    it('should throw error for invalid minutes (too high)', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 65,
        polygon: validPolygon,
        areaSqKm: 12.5,
      };

      expect(() => validateIsochroneBoundary(boundary)).toThrow(
        'Minutes must be between 1 and 60'
      );
    });

    it('should throw error for negative area', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: validPolygon,
        areaSqKm: -1,
      };

      expect(() => validateIsochroneBoundary(boundary)).toThrow(
        'Area must be positive'
      );
    });

    it('should throw error for invalid polygon (not a Polygon type)', () => {
      const invalidPolygon = {
        type: 'Point',
        coordinates: [-97.7431, 30.2672],
      } as unknown as GeoJSON.Polygon;

      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon: invalidPolygon,
        areaSqKm: 12.5,
      };

      expect(() => validateIsochroneBoundary(boundary)).toThrow(
        'Invalid polygon geometry'
      );
    });
  });

  describe('validateBoundaryData', () => {
    it('should validate circular boundary', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: 5.5,
      };

      expect(() => validateBoundaryData(boundary)).not.toThrow();
    });

    it('should validate isochrone boundary', () => {
      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'cycling',
        travelTimeMin: 20,
        polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [-97.7531, 30.2772],
              [-97.7331, 30.2772],
              [-97.7331, 30.2572],
              [-97.7531, 30.2572],
              [-97.7531, 30.2772],
            ],
          ],
        },
        areaSqKm: 25.0,
      };

      expect(() => validateBoundaryData(boundary)).not.toThrow();
    });

    it('should throw error for unknown boundary type', () => {
      const boundary = {
        type: 'polygon',
        center: [-97.7431, 30.2672],
      } as unknown as CommunityBoundary;

      expect(() => validateBoundaryData(boundary)).toThrow(
        'Unknown boundary type'
      );
    });
  });

  describe('transformBoundaryToDb', () => {
    it('should transform circular boundary to database format', () => {
      const boundary: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: 5.5,
      };

      const result = transformBoundaryToDb(boundary);

      expect(result.boundaryJson).toEqual(boundary);
      expect(result.boundaryGeometry).toBeNull();
      expect(result.boundaryGeometryDetailed).toBeNull();
    });

    it('should transform isochrone boundary to database format with simplified geometry', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-97.7531, 30.2772],
            [-97.7331, 30.2772],
            [-97.7331, 30.2572],
            [-97.7531, 30.2572],
            [-97.7531, 30.2772],
          ],
        ],
      };

      const boundary: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon,
        areaSqKm: 12.5,
      };

      const result = transformBoundaryToDb(boundary);

      expect(result.boundaryJson).toEqual(boundary);
      expect(result.boundaryGeometry).toBeTruthy(); // Should have simplified geometry
      expect(result.boundaryGeometryDetailed).toBeTruthy(); // Should have detailed geometry
    });
  });

  describe('transformBoundaryFromDb', () => {
    it('should transform circular boundary from database format', () => {
      const boundaryJson: CircularBoundary = {
        type: 'circular',
        center: { lng: -97.7431, lat: 30.2672 },
        radiusKm: 5.5,
      };

      const result = transformBoundaryFromDb({
        boundary: boundaryJson,
        boundary_geometry: null,
        boundary_geometry_detailed: null,
      });

      expect(result).toEqual(boundaryJson);
    });

    it('should transform isochrone boundary from database format', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-97.7531, 30.2772],
            [-97.7331, 30.2772],
            [-97.7331, 30.2572],
            [-97.7531, 30.2572],
            [-97.7531, 30.2772],
          ],
        ],
      };

      const boundaryJson: IsochroneBoundary = {
        type: 'isochrone',
        center: { lng: -97.7431, lat: 30.2672 },
        travelMode: 'walking',
        travelTimeMin: 15,
        polygon,
        areaSqKm: 12.5,
      };

      // Mock PostGIS geometry data
      const mockGeometry = 'POLYGON((-97.7531 30.2772,-97.7331 30.2772,-97.7331 30.2572,-97.7531 30.2572,-97.7531 30.2772))';

      const result = transformBoundaryFromDb({
        boundary: boundaryJson,
        boundary_geometry: mockGeometry,
        boundary_geometry_detailed: mockGeometry,
      });

      expect(result).toEqual(boundaryJson);
    });

    it('should return null for null boundary data', () => {
      const result = transformBoundaryFromDb({
        boundary: null,
        boundary_geometry: null,
        boundary_geometry_detailed: null,
      });

      expect(result).toBeNull();
    });
  });
});