import { describe, it, expect } from 'vitest';
import { parsePostGisPoint, toPostGisPoint } from '../utils';

describe('parsePostGisPoint', () => {
  describe('when given null or undefined', () => {
    it('should return default coords for null', () => {
      const result = parsePostGisPoint(null);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for undefined', () => {
      const result = parsePostGisPoint(undefined);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for empty string', () => {
      const result = parsePostGisPoint('');
      expect(result).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('when given string format', () => {
    it('should parse valid POINT string with positive coordinates', () => {
      const result = parsePostGisPoint('POINT(-122.4194 37.7749)');
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should parse valid POINT string with negative coordinates', () => {
      const result = parsePostGisPoint('POINT(-74.006 40.7128)');
      expect(result).toEqual({ lng: -74.006, lat: 40.7128 });
    });

    it('should parse valid POINT string with integer coordinates', () => {
      const result = parsePostGisPoint('POINT(0 0)');
      expect(result).toEqual({ lng: 0, lat: 0 });
    });

    it('should return default coords for invalid POINT string format', () => {
      const result = parsePostGisPoint('INVALID(-122.4194 37.7749)');
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for malformed POINT string', () => {
      const result = parsePostGisPoint('POINT(-122.4194)');
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for POINT with non-numeric values', () => {
      const result = parsePostGisPoint('POINT(abc def)');
      expect(result).toEqual({ lng: NaN, lat: NaN });
    });
  });

  describe('when given object with x/y coordinates', () => {
    it('should parse object with valid x/y coordinates', () => {
      const result = parsePostGisPoint({ x: -122.4194, y: 37.7749 });
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should parse object with string x/y coordinates', () => {
      const result = parsePostGisPoint({ x: '-122.4194', y: '37.7749' });
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should return default coords for object with invalid x/y coordinates', () => {
      const result = parsePostGisPoint({ x: 'invalid', y: 'invalid' });
      expect(result).toEqual({ lng: 0, lat: 0 });
    });

    it('should return default coords for object missing x coordinate', () => {
      const result = parsePostGisPoint({ y: 37.7749 });
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for object missing y coordinate', () => {
      const result = parsePostGisPoint({ x: -122.4194 });
      expect(result).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('when given object with lat/lng coordinates', () => {
    it('should parse object with valid lat/lng coordinates', () => {
      const result = parsePostGisPoint({ lat: 37.7749, lng: -122.4194 });
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should parse object with string lat/lng coordinates', () => {
      const result = parsePostGisPoint({ lat: '37.7749', lng: '-122.4194' });
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should return default coords for object with invalid lat/lng coordinates', () => {
      const result = parsePostGisPoint({ lat: 'invalid', lng: 'invalid' });
      expect(result).toEqual({ lng: 0, lat: 0 });
    });

    it('should return default coords for object missing lat coordinate', () => {
      const result = parsePostGisPoint({ lng: -122.4194 });
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for object missing lng coordinate', () => {
      const result = parsePostGisPoint({ lat: 37.7749 });
      expect(result).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('when given other types', () => {
    it('should return default coords for number', () => {
      const result = parsePostGisPoint(123);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for boolean', () => {
      const result = parsePostGisPoint(true);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for array', () => {
      const result = parsePostGisPoint([1, 2]);
      expect(result).toEqual({ lat: 0, lng: 0 });
    });

    it('should return default coords for empty object', () => {
      const result = parsePostGisPoint({});
      expect(result).toEqual({ lat: 0, lng: 0 });
    });
  });

  describe('edge cases', () => {
    it('should handle object with both x/y and lat/lng (x/y takes precedence)', () => {
      const result = parsePostGisPoint({ 
        x: -122.4194, 
        y: 37.7749, 
        lat: 40.7128, 
        lng: -74.006 
      });
      expect(result).toEqual({ lng: -122.4194, lat: 37.7749 });
    });

    it('should handle zero coordinates', () => {
      const result = parsePostGisPoint({ x: 0, y: 0 });
      expect(result).toEqual({ lng: 0, lat: 0 });
    });

    it('should handle negative zero coordinates', () => {
      const result = parsePostGisPoint({ x: -0, y: -0 });
      expect(result).toEqual({ lng: 0, lat: 0 });
    });
  });
});

describe('toPostGisPoint', () => {
  it('should convert lat/lng coords to POINT string format', () => {
    const result = toPostGisPoint({ lat: 37.7749, lng: -122.4194 });
    expect(result).toBe('POINT(-122.4194 37.7749)');
  });

  it('should handle zero coordinates', () => {
    const result = toPostGisPoint({ lat: 0, lng: 0 });
    expect(result).toBe('POINT(0 0)');
  });

  it('should handle negative coordinates', () => {
    const result = toPostGisPoint({ lat: -37.7749, lng: 122.4194 });
    expect(result).toBe('POINT(122.4194 -37.7749)');
  });

  it('should handle decimal coordinates with many digits', () => {
    const result = toPostGisPoint({ lat: 37.774929, lng: -122.419416 });
    expect(result).toBe('POINT(-122.419416 37.774929)');
  });

  it('should handle integer coordinates', () => {
    const result = toPostGisPoint({ lat: 40, lng: -74 });
    expect(result).toBe('POINT(-74 40)');
  });
});