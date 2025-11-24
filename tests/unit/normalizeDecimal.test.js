/**
 * Unit tests for normalizeDecimal function
 */

import { describe, it, expect } from 'vitest';
import { normalizeDecimal } from '../../src/core.js';

describe('normalizeDecimal', () => {
  describe('empty and invalid inputs', () => {
    it('should handle null and undefined', () => {
      expect(normalizeDecimal(null)).toEqual({ display: '', value: null, raw: '' });
      expect(normalizeDecimal(undefined)).toEqual({ display: '', value: null, raw: '' });
    });

    it('should handle empty string', () => {
      expect(normalizeDecimal('')).toEqual({ display: '', value: null, raw: '' });
    });

    it('should handle whitespace only', () => {
      expect(normalizeDecimal('   ')).toEqual({ display: '', value: null, raw: '' });
    });

    it('should handle non-numeric strings', () => {
      const result = normalizeDecimal('abc');
      expect(result.value).toBe(null);
      expect(result.raw).toBe('abc');
    });
  });

  describe('comma as decimal separator (European format)', () => {
    it('should parse simple comma decimal', () => {
      const result = normalizeDecimal('23,4');
      expect(result.value).toBe(23.4);
      expect(result.raw).toBe('23,4');
    });

    it('should parse comma decimal with preserveDisplay', () => {
      const result = normalizeDecimal('23,4', { preserveDisplay: true });
      expect(result.value).toBe(23.4);
      expect(result.display).toBe('23,4');
    });

    it('should handle multiple decimal places', () => {
      const result = normalizeDecimal('123,456');
      expect(result.value).toBe(123.456);
    });

    it('should handle leading zeros', () => {
      const result = normalizeDecimal('0,5');
      expect(result.value).toBe(0.5);
    });
  });

  describe('dot as decimal separator (US/UK format)', () => {
    it('should parse simple dot decimal', () => {
      const result = normalizeDecimal('23.4');
      expect(result.value).toBe(23.4);
      expect(result.raw).toBe('23.4');
    });

    it('should convert dot to comma in display with preserveDisplay', () => {
      const result = normalizeDecimal('23.4', { preserveDisplay: true });
      expect(result.value).toBe(23.4);
      expect(result.display).toBe('23,4');
    });

    it('should handle multiple decimal places', () => {
      const result = normalizeDecimal('123.456');
      expect(result.value).toBe(123.456);
    });
  });

  describe('mixed formats (thousands separators)', () => {
    it('should handle comma thousands with dot decimal (1,234.56)', () => {
      const result = normalizeDecimal('1,234.56');
      expect(result.value).toBe(1234.56);
    });

    it('should handle dot thousands with comma decimal (1.234,56)', () => {
      const result = normalizeDecimal('1.234,56');
      expect(result.value).toBe(1234.56);
    });

    it('should handle multiple thousands separators (1,234,567.89)', () => {
      const result = normalizeDecimal('1,234,567.89');
      expect(result.value).toBe(1234567.89);
    });

    it('should handle European multiple thousands (1.234.567,89)', () => {
      const result = normalizeDecimal('1.234.567,89');
      expect(result.value).toBe(1234567.89);
    });
  });

  describe('space thousands separators (invalid)', () => {
    it('should reject space as thousands separator', () => {
      const result = normalizeDecimal('1 234,5');
      expect(result.value).toBe(null);
      expect(result.display).toBe('1 234,5');
    });

    it('should reject multiple spaces', () => {
      const result = normalizeDecimal('1 234 567');
      expect(result.value).toBe(null);
    });

    it('should handle tab character as space', () => {
      const result = normalizeDecimal('1\t234');
      expect(result.value).toBe(null);
    });
  });

  describe('integer values', () => {
    it('should handle simple integers', () => {
      const result = normalizeDecimal('123');
      expect(result.value).toBe(123);
    });

    it('should handle zero', () => {
      const result = normalizeDecimal('0');
      expect(result.value).toBe(0);
    });

    it('should handle large integers', () => {
      const result = normalizeDecimal('1234567890');
      expect(result.value).toBe(1234567890);
    });
  });

  describe('negative numbers', () => {
    it('should handle negative with comma decimal', () => {
      const result = normalizeDecimal('-23,4');
      expect(result.value).toBe(-23.4);
    });

    it('should handle negative with dot decimal', () => {
      const result = normalizeDecimal('-23.4');
      expect(result.value).toBe(-23.4);
    });

    it('should handle negative integers', () => {
      const result = normalizeDecimal('-123');
      expect(result.value).toBe(-123);
    });
  });

  describe('edge cases', () => {
    it('should handle very small decimals', () => {
      const result = normalizeDecimal('0,001');
      expect(result.value).toBeCloseTo(0.001);
    });

    it('should handle very large numbers', () => {
      const result = normalizeDecimal('999999999.99');
      expect(result.value).toBe(999999999.99);
    });

    it('should handle numbers with only decimal part', () => {
      const result = normalizeDecimal(',5');
      // This might be NaN since it's invalid
      expect(result.value).toBe(null);
    });

    it('should handle trailing decimal point', () => {
      const result = normalizeDecimal('123.');
      expect(result.value).toBe(123);
    });

    it('should handle leading decimal point', () => {
      const result = normalizeDecimal('.5');
      expect(result.value).toBe(0.5);
    });

    it('should trim whitespace', () => {
      const result = normalizeDecimal('  23,4  ');
      expect(result.value).toBe(23.4);
    });
  });

  describe('preserveDisplay option', () => {
    it('should preserve original format when true', () => {
      const result = normalizeDecimal('1.234,56', { preserveDisplay: true });
      expect(result.display).toBe('1.234,56');
    });

    it('should normalize format when false', () => {
      const result = normalizeDecimal('1.234,56', { preserveDisplay: false });
      expect(result.display).not.toBe('1.234,56');
    });
  });

  describe('raw value preservation', () => {
    it('should always preserve raw input', () => {
      expect(normalizeDecimal('23,4').raw).toBe('23,4');
      expect(normalizeDecimal('  23.4  ').raw).toBe('23.4');
      expect(normalizeDecimal('invalid').raw).toBe('invalid');
    });
  });
});
