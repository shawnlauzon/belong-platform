import { describe, it, expect } from 'vitest';
import {
  generateConnectionCode,
  isValidConnectionCode,
  normalizeConnectionCode,
  formatConnectionUrl,
} from '../../utils/codeUtils';

describe('codeGenerator', () => {
  describe('generateConnectionCode', () => {
    it('should generate an 8-character uppercase code', () => {
      const code = generateConnectionCode();

      expect(code).toHaveLength(8);
      expect(code).toMatch(/^[A-Z0-9]+$/);
      expect(code).toBe(code.toUpperCase());
    });

    it('should not include ambiguous characters', () => {
      // Generate many codes to test exclusions
      const codes = Array.from({ length: 100 }, () => generateConnectionCode());
      const allChars = codes.join('');

      expect(allChars).not.toMatch(/[01IO]/); // Should not contain 0, 1, I, O
    });

    it('should generate unique codes', () => {
      const codes = new Set();

      // Generate 100 codes - should be unique
      for (let i = 0; i < 100; i++) {
        const code = generateConnectionCode();
        codes.add(code);
      }

      expect(codes.size).toBe(100); // All codes should be unique
    });
  });

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
      expect(isValidConnectionCode(null as any)).toBe(false);
      expect(isValidConnectionCode(undefined as any)).toBe(false);
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

  describe('formatConnectionUrl', () => {
    it('should format URL with default base', () => {
      const url = formatConnectionUrl('ABCD2345');
      expect(url).toBe('https://app.belong.network/connect/ABCD2345');
    });

    it('should format URL with custom base', () => {
      const url = formatConnectionUrl('ABCD2345', 'https://custom.domain.com');
      expect(url).toBe('https://custom.domain.com/connect/ABCD2345');
    });

    it('should handle trailing slash in base URL', () => {
      const url = formatConnectionUrl('ABCD2345', 'https://custom.domain.com/');
      expect(url).toBe('https://custom.domain.com/connect/ABCD2345');
    });
  });
});
