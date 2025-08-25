import { describe, it, expect } from 'vitest';
import {
  isValidConnectionCode,
  normalizeConnectionCode,
} from '../../utils/codeUtils';

describe('codeGenerator', () => {
  describe('isValidConnectionCode', () => {
    it('should validate correct codes', () => {
      expect(isValidConnectionCode('ABCD2345')).toBe(true);
      expect(isValidConnectionCode('XYZ23ABC')).toBe(true);
      expect(isValidConnectionCode('23456789')).toBe(true);
    });

    it('should reject invalid codes', () => {
      expect(isValidConnectionCode('')).toBe(false);
      expect(isValidConnectionCode('ABC123')).toBe(false); // Too short
      expect(isValidConnectionCode('ABCD12345')).toBe(false); // Too long
      expect(isValidConnectionCode('ABCD123O')).toBe(false); // Contains O
      expect(isValidConnectionCode('ABCD1231')).toBe(false); // Contains 1
      expect(isValidConnectionCode('ABCD123I')).toBe(false); // Contains I
      expect(isValidConnectionCode('ABCD1230')).toBe(false); // Contains 0
      expect(isValidConnectionCode('abcd2345')).toBe(false); // Lowercase
      expect(isValidConnectionCode('ABCD-234')).toBe(false); // Special chars
    });

    it('should handle null and undefined', () => {
      expect(isValidConnectionCode(null as unknown as string)).toBe(false);
      expect(isValidConnectionCode(undefined as unknown as string)).toBe(false);
    });
  });

  describe('normalizeConnectionCode', () => {
    it('should convert to uppercase', () => {
      expect(normalizeConnectionCode('abcd2345')).toBe('ABCD2345');
      expect(normalizeConnectionCode('xyz23abc')).toBe('XYZ23ABC');
    });

    it('should trim whitespace', () => {
      expect(normalizeConnectionCode(' ABCD2345 ')).toBe('ABCD2345');
      expect(normalizeConnectionCode('  XYZ23ABC  ')).toBe('XYZ23ABC');
    });

    it('should handle mixed case and whitespace', () => {
      expect(normalizeConnectionCode(' aBcD2345 ')).toBe('ABCD2345');
    });
  });

});
