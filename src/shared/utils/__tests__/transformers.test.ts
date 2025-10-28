import { describe, it, expect } from 'vitest';
import { caseTransform, PointSchema } from '../transformers';

describe('caseTransform', () => {
  describe('toSnakeCase', () => {
    it('should transform simple object keys to snake_case', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com'
      };

      const result = caseTransform.toSnakeCase(input);
      
      expect(result).toEqual({
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        },
        createdAt: '2024-01-01'
      };

      const result = caseTransform.toSnakeCase(input);
      
      expect(result).toEqual({
        user_info: {
          first_name: 'John',
          last_name: 'Doe'
        },
        created_at: '2024-01-01'
      });
    });

    it('should handle arrays', () => {
      const input = {
        userList: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ]
      };

      const result = caseTransform.toSnakeCase(input);
      
      expect(result).toEqual({
        user_list: [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' }
        ]
      });
    });

    it('should handle null and undefined values', () => {
      const input = {
        validValue: 'test',
        nullValue: null,
        undefinedValue: undefined
      };

      const result = caseTransform.toSnakeCase(input);
      
      expect(result).toEqual({
        valid_value: 'test',
        null_value: null,
        undefined_value: undefined
      });
    });

    it('should handle primitive values', () => {
      expect(caseTransform.toSnakeCase('string')).toBe('string');
      expect(caseTransform.toSnakeCase(123)).toBe(123);
      expect(caseTransform.toSnakeCase(true)).toBe(true);
      expect(caseTransform.toSnakeCase(null)).toBe(null);
    });
  });

  describe('toCamelCase', () => {
    it('should transform simple object keys to camelCase', () => {
      const input = {
        first_name: 'John',
        last_name: 'Doe',
        email_address: 'john@example.com'
      };

      const result = caseTransform.toCamelCase(input);
      
      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com'
      });
    });

    it('should handle nested objects', () => {
      const input = {
        user_info: {
          first_name: 'John',
          last_name: 'Doe'
        },
        created_at: '2024-01-01'
      };

      const result = caseTransform.toCamelCase(input);
      
      expect(result).toEqual({
        userInfo: {
          firstName: 'John',
          lastName: 'Doe'
        },
        createdAt: '2024-01-01'
      });
    });

    it('should handle arrays', () => {
      const input = {
        user_list: [
          { first_name: 'John', last_name: 'Doe' },
          { first_name: 'Jane', last_name: 'Smith' }
        ]
      };

      const result = caseTransform.toCamelCase(input);
      
      expect(result).toEqual({
        userList: [
          { firstName: 'John', lastName: 'Doe' },
          { firstName: 'Jane', lastName: 'Smith' }
        ]
      });
    });

    it('should handle deep nesting', () => {
      const input = {
        level_one: {
          level_two: {
            level_three: {
              final_value: 'test'
            }
          }
        }
      };

      const result = caseTransform.toCamelCase(input);
      
      expect(result).toEqual({
        levelOne: {
          levelTwo: {
            levelThree: {
              finalValue: 'test'
            }
          }
        }
      });
    });
  });

  describe('round-trip transformation', () => {
    it('should preserve data through camelCase -> snake_case -> camelCase', () => {
      const original = {
        userId: '123',
        firstName: 'John',
        metadata: {
          createdAt: '2024-01-01',
          preferences: {
            notificationSettings: {
              emailEnabled: true
            }
          }
        },
        tags: ['important', 'user']
      };

      const snakeCase = caseTransform.toSnakeCase(original);
      const backToCamel = caseTransform.toCamelCase(snakeCase);
      
      expect(backToCamel).toEqual(original);
    });

    it('should preserve data through snake_case -> camelCase -> snake_case', () => {
      const original = {
        user_id: '123',
        first_name: 'John',
        metadata: {
          created_at: '2024-01-01',
          preferences: {
            notification_settings: {
              notifications_enabled: true
            }
          }
        },
        tags: ['important', 'user']
      };

      const camelCase = caseTransform.toCamelCase(original);
      const backToSnake = caseTransform.toSnakeCase(camelCase);
      
      expect(backToSnake).toEqual(original);
    });
  });
});

describe('PointSchema', () => {
  describe('fromPostGIS', () => {
    it('should parse valid PostGIS POINT string', () => {
      const pointString = 'POINT(-122.4194 37.7749)';
      const result = PointSchema.fromPostGIS(pointString);
      
      expect(result).toEqual({
        lng: -122.4194,
        lat: 37.7749
      });
    });

    it('should handle integer coordinates', () => {
      const pointString = 'POINT(-122 37)';
      const result = PointSchema.fromPostGIS(pointString);
      
      expect(result).toEqual({
        lng: -122,
        lat: 37
      });
    });

    it('should throw error for invalid format', () => {
      const invalidStrings = [
        'INVALID(-122.4194 37.7749)',
        'POINT(-122.4194)',
        'POINT(invalid coords)',
        'not a point at all'
      ];

      invalidStrings.forEach(invalid => {
        expect(() => PointSchema.fromPostGIS(invalid)).toThrow('Invalid PostGIS point format');
      });
    });
  });

  describe('toPostGIS', () => {
    it('should convert lat/lng object to PostGIS POINT string', () => {
      const point = { lat: 37.7749, lng: -122.4194 };
      const result = PointSchema.toPostGIS(point);
      
      expect(result).toBe('POINT(-122.4194 37.7749)');
    });

    it('should handle integer coordinates', () => {
      const point = { lat: 37, lng: -122 };
      const result = PointSchema.toPostGIS(point);
      
      expect(result).toBe('POINT(-122 37)');
    });

    it('should preserve precision', () => {
      const point = { lat: 37.774929, lng: -122.419416 };
      const result = PointSchema.toPostGIS(point);
      
      expect(result).toBe('POINT(-122.419416 37.774929)');
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve coordinates through PostGIS -> object -> PostGIS', () => {
      const original = 'POINT(-122.4194 37.7749)';
      const parsed = PointSchema.fromPostGIS(original);
      const backToString = PointSchema.toPostGIS(parsed);
      
      expect(backToString).toBe(original);
    });

    it('should preserve coordinates through object -> PostGIS -> object', () => {
      const original = { lat: 37.7749, lng: -122.4194 };
      const stringified = PointSchema.toPostGIS(original);
      const backToObject = PointSchema.fromPostGIS(stringified);
      
      expect(backToObject).toEqual(original);
    });
  });
});