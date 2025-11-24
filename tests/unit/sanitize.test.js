/**
 * Unit tests for sanitization functions
 */

import { describe, it, expect } from 'vitest';
import { sanitizeString, escapeHtml } from '../../src/core.js';

describe('sanitizeString', () => {
  describe('basic functionality', () => {
    it('should return empty string for non-string input', () => {
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });

    it('should pass through normal strings unchanged', () => {
      expect(sanitizeString('hello')).toBe('hello');
      expect(sanitizeString('Hello World')).toBe('Hello World');
      expect(sanitizeString('test123')).toBe('test123');
    });

    it('should preserve spaces and normal punctuation', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
      expect(sanitizeString('test.value')).toBe('test.value');
      expect(sanitizeString('name: test')).toBe('name: test');
    });
  });

  describe('XSS prevention', () => {
    it('should remove angle brackets', () => {
      expect(sanitizeString('<script>')).toBe('script');
      expect(sanitizeString('</script>')).toBe('/script');
      expect(sanitizeString('<div>test</div>')).toBe('divtest/div');
    });

    it('should remove quotes', () => {
      expect(sanitizeString("test'value")).toBe('testvalue');
      expect(sanitizeString('test"value')).toBe('testvalue');
      expect(sanitizeString("it's a \"test\"")).toBe('its a test');
    });

    it('should handle complex XSS payloads', () => {
      const xss1 = '<script>alert("XSS")</script>';
      expect(sanitizeString(xss1)).not.toContain('<');
      expect(sanitizeString(xss1)).not.toContain('>');
      expect(sanitizeString(xss1)).not.toContain('"');

      const xss2 = '<img src=x onerror="alert(1)">';
      expect(sanitizeString(xss2)).not.toContain('<');
      expect(sanitizeString(xss2)).not.toContain('>');

      const xss3 = "javascript:alert('XSS')";
      expect(sanitizeString(xss3)).not.toContain("'");
    });

    it('should handle nested tags', () => {
      const nested = '<<script>>alert<</script>>';
      expect(sanitizeString(nested)).not.toContain('<');
      expect(sanitizeString(nested)).not.toContain('>');
    });
  });

  describe('length limiting', () => {
    it('should limit string length to default 100', () => {
      const longString = 'a'.repeat(150);
      expect(sanitizeString(longString).length).toBe(100);
    });

    it('should respect custom maxLength', () => {
      const longString = 'a'.repeat(50);
      expect(sanitizeString(longString, 20).length).toBe(20);
      expect(sanitizeString(longString, 200).length).toBe(50);
    });

    it('should handle maxLength of 0', () => {
      expect(sanitizeString('hello', 0)).toBe('');
    });

    it('should handle strings shorter than maxLength', () => {
      expect(sanitizeString('hello', 100)).toBe('hello');
    });
  });

  describe('unicode handling', () => {
    it('should preserve unicode characters', () => {
      expect(sanitizeString('héllo')).toBe('héllo');
      expect(sanitizeString('日本語')).toBe('日本語');
      expect(sanitizeString('émoji 👍')).toBe('émoji 👍');
    });

    it('should handle mixed content', () => {
      expect(sanitizeString('Café <script>')).toBe('Café script');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(sanitizeString('')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(sanitizeString('   ')).toBe('   ');
      expect(sanitizeString('\t\n')).toBe('\t\n');
    });

    it('should handle string with only forbidden chars', () => {
      expect(sanitizeString('<>"\'<>\'')).toBe('');
    });
  });
});

describe('escapeHtml', () => {
  describe('basic functionality', () => {
    it('should return empty string for non-string input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
      expect(escapeHtml(123)).toBe('');
    });

    it('should pass through normal strings unchanged', () => {
      expect(escapeHtml('hello')).toBe('hello');
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('HTML entity escaping', () => {
    it('should escape ampersand', () => {
      expect(escapeHtml('a & b')).toBe('a &amp; b');
      expect(escapeHtml('&&&')).toBe('&amp;&amp;&amp;');
    });

    it('should escape angle brackets', () => {
      expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
      expect(escapeHtml('a < b > c')).toBe('a &lt; b &gt; c');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
      expect(escapeHtml("'hello'")).toBe('&#039;hello&#039;');
    });

    it('should escape all special characters together', () => {
      const input = '<script>alert("test\'s & value")</script>';
      const expected = '&lt;script&gt;alert(&quot;test&#039;s &amp; value&quot;)&lt;/script&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle strings without special characters', () => {
      expect(escapeHtml('normal text')).toBe('normal text');
    });

    it('should preserve unicode', () => {
      expect(escapeHtml('héllo <world>')).toBe('héllo &lt;world&gt;');
    });
  });
});
