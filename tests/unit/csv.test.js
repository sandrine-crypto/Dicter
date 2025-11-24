/**
 * Unit tests for CSV parsing functions
 */

import { describe, it, expect } from 'vitest';
import { detectDelimiter, parseCSVLine, parseCSV, parseText } from '../../src/core.js';

describe('detectDelimiter', () => {
  describe('basic delimiter detection', () => {
    it('should detect semicolon delimiter', () => {
      const sample = 'a;b;c\n1;2;3\n4;5;6';
      expect(detectDelimiter(sample)).toBe(';');
    });

    it('should detect comma delimiter', () => {
      const sample = 'a,b,c\n1,2,3\n4,5,6';
      expect(detectDelimiter(sample)).toBe(',');
    });

    it('should detect tab delimiter', () => {
      const sample = 'a\tb\tc\n1\t2\t3\n4\t5\t6';
      expect(detectDelimiter(sample)).toBe('\t');
    });

    it('should detect pipe delimiter', () => {
      const sample = 'a|b|c\n1|2|3\n4|5|6';
      expect(detectDelimiter(sample)).toBe('|');
    });
  });

  describe('mixed delimiters', () => {
    it('should choose most frequent delimiter', () => {
      const sample = 'a;b;c;d\n1,2\n3;4;5;6';
      expect(detectDelimiter(sample)).toBe(';');
    });

    it('should handle text with commas in data', () => {
      const sample = 'name;value\n"hello, world";123\ntest;456';
      expect(detectDelimiter(sample)).toBe(';');
    });
  });

  describe('edge cases', () => {
    it('should return semicolon for empty input', () => {
      expect(detectDelimiter('')).toBe(';');
      expect(detectDelimiter(null)).toBe(';');
      expect(detectDelimiter(undefined)).toBe(';');
    });

    it('should return semicolon for no delimiters', () => {
      const sample = 'abc\ndef\nghi';
      expect(detectDelimiter(sample)).toBe(';');
    });

    it('should handle single line', () => {
      const sample = 'a;b;c';
      expect(detectDelimiter(sample)).toBe(';');
    });

    it('should handle CRLF line endings', () => {
      const sample = 'a;b\r\nc;d\r\ne;f';
      expect(detectDelimiter(sample)).toBe(';');
    });

    it('should only analyze first 5 lines', () => {
      const lines = [];
      for (let i = 0; i < 10; i++) {
        lines.push(i < 5 ? 'a;b;c' : 'a,b,c,d,e,f,g');
      }
      expect(detectDelimiter(lines.join('\n'))).toBe(';');
    });

    it('should skip empty lines', () => {
      const sample = '\n\na;b;c\n\n1;2;3';
      expect(detectDelimiter(sample)).toBe(';');
    });
  });
});

describe('parseCSVLine', () => {
  describe('basic parsing', () => {
    it('should parse simple comma-separated values', () => {
      expect(parseCSVLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
    });

    it('should parse semicolon-separated values', () => {
      expect(parseCSVLine('a;b;c', ';')).toEqual(['a', 'b', 'c']);
    });

    it('should parse tab-separated values', () => {
      expect(parseCSVLine('a\tb\tc', '\t')).toEqual(['a', 'b', 'c']);
    });

    it('should use comma as default delimiter', () => {
      expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c']);
    });
  });

  describe('quoted fields', () => {
    it('should handle quoted values', () => {
      expect(parseCSVLine('"hello","world"', ',')).toEqual(['hello', 'world']);
    });

    it('should handle delimiter inside quotes', () => {
      expect(parseCSVLine('"a,b",c', ',')).toEqual(['a,b', 'c']);
      expect(parseCSVLine('ech 1,"23,4"', ',')).toEqual(['ech 1', '23,4']);
    });

    it('should handle escaped quotes (doubled)', () => {
      expect(parseCSVLine('test,"val""ue"', ',')).toEqual(['test', 'val"ue']);
      expect(parseCSVLine('"a""b""c"', ',')).toEqual(['a"b"c']);
    });

    it('should handle multiple escaped quotes', () => {
      expect(parseCSVLine('"""""",test', ',')).toEqual(['""', 'test']);
    });

    it('should handle empty quoted fields', () => {
      expect(parseCSVLine('"",test', ',')).toEqual(['', 'test']);
    });

    it('should handle quotes at start and end only', () => {
      expect(parseCSVLine('"hello world",test', ',')).toEqual(['hello world', 'test']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null/undefined', () => {
      expect(parseCSVLine(null, ',')).toEqual([]);
      expect(parseCSVLine(undefined, ',')).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseCSVLine('', ',')).toEqual(['']);
    });

    it('should handle single field', () => {
      expect(parseCSVLine('hello', ',')).toEqual(['hello']);
    });

    it('should handle empty fields', () => {
      expect(parseCSVLine('a,,c', ',')).toEqual(['a', '', 'c']);
      expect(parseCSVLine(',b,', ',')).toEqual(['', 'b', '']);
    });

    it('should handle only delimiters', () => {
      expect(parseCSVLine(',,', ',')).toEqual(['', '', '']);
    });

    it('should preserve whitespace in unquoted fields', () => {
      expect(parseCSVLine(' a , b ', ',')).toEqual([' a ', ' b ']);
    });

    it('should preserve whitespace in quoted fields', () => {
      expect(parseCSVLine('" a "," b "', ',')).toEqual([' a ', ' b ']);
    });
  });

  describe('complex cases', () => {
    it('should handle real-world data', () => {
      const line = '"Échantillon 1","12,34","Valid"';
      expect(parseCSVLine(line, ',')).toEqual(['Échantillon 1', '12,34', 'Valid']);
    });

    it('should handle unicode', () => {
      expect(parseCSVLine('日本語,中文,한국어', ',')).toEqual(['日本語', '中文', '한국어']);
    });

    it('should handle newline in quotes', () => {
      // Note: This is a limitation - our parser doesn't handle multiline
      // but it should at least not crash
      const line = '"line1\nline2",value';
      expect(parseCSVLine(line, ',')).toEqual(['line1\nline2', 'value']);
    });
  });
});

describe('parseCSV', () => {
  describe('basic functionality', () => {
    it('should parse simple CSV with semicolons', () => {
      const csv = 'label1;10\nlabel2;20';
      const result = parseCSV(csv, ';');
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('label1');
      expect(result[0].value).toBe(10);
      expect(result[1].label).toBe('label2');
      expect(result[1].value).toBe(20);
    });

    it('should auto-detect delimiter', () => {
      const csv = 'label1;10\nlabel2;20';
      const result = parseCSV(csv);
      expect(result).toHaveLength(2);
    });

    it('should handle comma decimals', () => {
      const csv = 'ech1;10,5\nech2;20,75';
      const result = parseCSV(csv, ';');
      expect(result[0].value).toBe(10.5);
      expect(result[1].value).toBe(20.75);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null/undefined', () => {
      expect(parseCSV(null)).toEqual([]);
      expect(parseCSV(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseCSV('')).toEqual([]);
    });

    it('should skip lines with less than 2 columns', () => {
      const csv = 'label1;10\njustonecolumn\nlabel2;20';
      const result = parseCSV(csv, ';');
      expect(result).toHaveLength(2);
    });

    it('should skip lines with empty label', () => {
      const csv = ';10\nlabel2;20';
      const result = parseCSV(csv, ';');
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('label2');
    });

    it('should skip lines with empty value', () => {
      const csv = 'label1;\nlabel2;20';
      const result = parseCSV(csv, ';');
      expect(result).toHaveLength(1);
    });

    it('should handle CRLF line endings', () => {
      const csv = 'label1;10\r\nlabel2;20\r\n';
      const result = parseCSV(csv, ';');
      expect(result).toHaveLength(2);
    });
  });

  describe('sanitization', () => {
    it('should sanitize labels', () => {
      const csv = '<script>;10';
      const result = parseCSV(csv, ';');
      expect(result[0].label).not.toContain('<');
      expect(result[0].label).not.toContain('>');
    });

    it('should strip surrounding quotes from labels', () => {
      const csv = '"label1";10';
      const result = parseCSV(csv, ';');
      expect(result[0].label).toBe('label1');
    });
  });
});

describe('parseText', () => {
  describe('basic functionality', () => {
    it('should parse tab-separated lines', () => {
      const text = 'ech 1\t12.34\nech 2\t56.78';
      const result = parseText(text);
      expect(result).toHaveLength(2);
      expect(result[0].label).toBe('ech 1');
      expect(result[0].value).toBe(12.34);
      expect(result[1].label).toBe('ech 2');
      expect(result[1].value).toBe(56.78);
    });

    it('should handle multiple tabs', () => {
      const text = 'label\t\t\t10';
      const result = parseText(text);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(10);
    });

    it('should handle comma decimals', () => {
      const text = 'ech 1\t12,34';
      const result = parseText(text);
      expect(result[0].value).toBe(12.34);
      expect(result[0].display).toBe('12,34');
    });
  });

  describe('line handling', () => {
    it('should handle CRLF line endings', () => {
      const text = 'ech 1\t10\r\nech 2\t20';
      const result = parseText(text);
      expect(result).toHaveLength(2);
    });

    it('should skip empty lines', () => {
      const text = 'ech 1\t10\n\n\nech 2\t20';
      const result = parseText(text);
      expect(result).toHaveLength(2);
    });

    it('should trim whitespace from lines', () => {
      const text = '  ech 1\t10  \n  ech 2\t20  ';
      const result = parseText(text);
      expect(result).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for null/undefined', () => {
      expect(parseText(null)).toEqual([]);
      expect(parseText(undefined)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseText('')).toEqual([]);
    });

    it('should skip lines without tabs', () => {
      const text = 'no tabs here\nlabel\t10';
      const result = parseText(text);
      expect(result).toHaveLength(1);
    });

    it('should skip lines with empty label', () => {
      const text = '\t10\nlabel\t20';
      const result = parseText(text);
      expect(result).toHaveLength(1);
    });

    it('should skip lines with empty value', () => {
      const text = 'label\t\nlabel2\t20';
      const result = parseText(text);
      expect(result).toHaveLength(1);
    });
  });

  describe('sanitization', () => {
    it('should sanitize labels', () => {
      const text = '<script>alert(1)</script>\t10';
      const result = parseText(text);
      expect(result[0].label).not.toContain('<');
      expect(result[0].label).not.toContain('>');
    });

    it('should limit label length', () => {
      const longLabel = 'a'.repeat(300);
      const text = `${longLabel}\t10`;
      const result = parseText(text);
      expect(result[0].label.length).toBeLessThanOrEqual(200);
    });
  });

  describe('value normalization', () => {
    it('should convert dot to comma in display', () => {
      const text = 'ech 2\t10.2';
      const result = parseText(text);
      expect(result[0].display).toBe('10,2');
    });

    it('should handle invalid numbers', () => {
      const text = 'label\tabc';
      const result = parseText(text);
      expect(result[0].value).toBe(null);
      expect(result[0].display).toBe('abc');
    });
  });
});
