/**
 * Sanitizer Tests - 净化器测试
 */

import { Sanitizer, SanitizerConfig, createSanitizer } from '../Sanitizer';

describe('Sanitizer', () => {
  describe('HTML Escaping', () => {
    const sanitizer = new Sanitizer();

    it('should escape HTML entities', () => {
      expect(sanitizer.escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(sanitizer.escapeHtml('A & B')).toBe('A &amp; B');
    });

    it('should escape quotes', () => {
      expect(sanitizer.escapeHtml("It's a test")).toBe('It&#x27;s a test');
      expect(sanitizer.escapeHtml('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should escape backticks', () => {
      expect(sanitizer.escapeHtml('`code`')).toBe('&#96;code&#96;');
    });
  });

  describe('SQL Escaping', () => {
    const sanitizer = new Sanitizer();

    it('should escape single quotes', () => {
      expect(sanitizer.escapeSql("John's car")).toBe("John\\'s car");
    });

    it('should escape double quotes', () => {
      expect(sanitizer.escapeSql('Say "Hello"')).toBe('Say \\"Hello\\"');
    });

    it('should escape backslashes', () => {
      expect(sanitizer.escapeSql('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape newlines', () => {
      expect(sanitizer.escapeSql('line1\nline2')).toBe('line1\\nline2');
    });
  });

  describe('Command Escaping', () => {
    const sanitizer = new Sanitizer();

    it('should remove shell metacharacters', () => {
      expect(sanitizer.escapeCommand('test;rm -rf /')).toBe('testrm -rf /');
      expect(sanitizer.escapeCommand('test|grep')).toBe('testgrep');
      expect(sanitizer.escapeCommand('test$(whoami)')).toBe('testwhoami');
      expect(sanitizer.escapeCommand('test`id`')).toBe('testid');
    });

    it('should escape quotes', () => {
      // 单引号和双引号会被转义
      expect(sanitizer.escapeCommand("test'or'1'='1")).toBe("test'\\''or'\\''1'\\''='\\''1");
    });
  });

  describe('Strip HTML', () => {
    const sanitizer = new Sanitizer();

    it('should remove HTML tags', () => {
      expect(sanitizer.stripHtml('<p>Hello World</p>')).toBe('Hello World');
      expect(sanitizer.stripHtml('<div><span>Test</span></div>')).toBe('Test');
    });

    it('should handle strings without HTML', () => {
      expect(sanitizer.stripHtml('Plain text')).toBe('Plain text');
    });
  });

  describe('Remove Event Handlers', () => {
    const sanitizer = new Sanitizer();

    it('should remove on* attributes', () => {
      // 移除on开头的属性
      expect(sanitizer.removeEventHandlers('<img src=x onerror=alert(1)>')).toBe(
        '<img src=x>'
      );
      expect(sanitizer.removeEventHandlers('<button onclick="doEvil()">Click</button>')).toBe(
        '<button>Click</button>'
      );
    });
  });

  describe('URL Sanitization', () => {
    const sanitizer = new Sanitizer();

    it('should allow valid HTTP/HTTPS URLs', () => {
      expect(sanitizer.sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizer.sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });

    it('should block javascript: protocol', () => {
      expect(sanitizer.sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should block data: protocol', () => {
      expect(sanitizer.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should handle invalid URLs', () => {
      expect(sanitizer.sanitizeUrl('not-a-url')).toBe('not-a-url');
    });
  });

  describe('Sanitize Object', () => {
    it('should sanitize nested objects', () => {
      const sanitizer = new Sanitizer({ sanitizeAll: true });
      const input = {
        name: '<script>alert(1)</script>',
        nested: {
          title: 'Hello <b>World</b>',
        },
      };

      const result = sanitizer.sanitize(input);
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.nested.title).toBe('Hello &lt;b&gt;World&lt;/b&gt;');
    });

    it('should sanitize arrays', () => {
      const sanitizer = new Sanitizer({ sanitizeAll: true });
      const input = {
        tags: ['<script>', 'normal', 'another<b>tag</b>'],
      };

      const result = sanitizer.sanitize(input);
      expect(result.tags[0]).toBe('&lt;script&gt;');
      expect(result.tags[1]).toBe('normal');
      expect(result.tags[2]).toBe('another&lt;b&gt;tag&lt;/b&gt;');
    });
  });

  describe('Sanitize by Fields', () => {
    it('should only sanitize specified fields', () => {
      const config: SanitizerConfig = {
        fields: [
          { field: 'name', type: 'html' },
          { field: 'description', type: 'html' },
        ],
      };
      const sanitizer = new Sanitizer(config);

      const input = {
        name: '<script>alert(1)</script>',
        description: 'Normal text',
        // This field should not be sanitized
        rawData: '<img src=x onerror=alert(1)>',
      };

      const result = sanitizer.sanitizeByFields(input);
      expect(result.name).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
      expect(result.description).toBe('Normal text');
      expect(result.rawData).toBe('<img src=x onerror=alert(1)>');
    });

    it('should handle nested fields', () => {
      const config: SanitizerConfig = {
        fields: [
          { field: 'user.name', type: 'html' },
        ],
      };
      const sanitizer = new Sanitizer(config);

      const input = {
        user: {
          name: '<b>John</b>',
          age: 30,
        },
      };

      const result = sanitizer.sanitizeByFields(input);
      expect(result.user.name).toBe('&lt;b&gt;John&lt;/b&gt;');
      expect(result.user.age).toBe(30);
    });
  });

  describe('Type-specific Sanitization', () => {
    const sanitizer = new Sanitizer();

    it('should sanitize HTML type', () => {
      const result = sanitizer.sanitize('<script>xss</script>', 'html');
      expect(result).toBe('&lt;script&gt;xss&lt;/script&gt;');
    });

    it('should sanitize SQL type', () => {
      const result = sanitizer.sanitize("admin' OR '1'='1", 'sql');
      expect(result).toBe("admin\\' OR \\'1\\'=\\'1");
    });

    it('should sanitize command type', () => {
      const result = sanitizer.sanitize('test; rm -rf', 'command');
      expect(result).toBe('test rm -rf');
    });

    it('should sanitize all types', () => {
      const result = sanitizer.sanitize('<script>alert(1)</script> OR 1=1; rm -rf', 'all');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain("'1'='1'");
    });
  });

  describe('Edge Cases', () => {
    const sanitizer = new Sanitizer();

    it('should handle null values', () => {
      expect(sanitizer.sanitize(null)).toBeNull();
    });

    it('should handle undefined values', () => {
      expect(sanitizer.sanitize(undefined)).toBeUndefined();
    });

    it('should handle empty strings', () => {
      expect(sanitizer.sanitize('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(sanitizer.sanitize(123)).toBe(123);
    });

    it('should handle booleans', () => {
      expect(sanitizer.sanitize(true)).toBe(true);
      expect(sanitizer.sanitize(false)).toBe(false);
    });
  });
});
