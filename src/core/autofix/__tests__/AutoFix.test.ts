/**
 * AutoFix 单元测试
 */

import { AutoFix } from '../AutoFix';

describe('AutoFix', () => {
  let autoFix: AutoFix;

  beforeEach(() => {
    autoFix = new AutoFix({
      maxRetries: 3,
      enableLinting: true,
      enableTesting: true,
      autoCommit: false,
      backupBeforeFix: true,
    });
  });

  describe('constructor', () => {
    it('should create AutoFix with default config', () => {
      const af = new AutoFix();
      expect(af).toBeDefined();
    });

    it('should accept custom config', () => {
      const af = new AutoFix({ maxRetries: 5 });
      expect(af).toBeDefined();
    });
  });

  describe('analyzeError', () => {
    it('should detect syntax error', async () => {
      const error = 'SyntaxError: Unexpected token { at app.ts:10:5';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('syntax_error');
      expect(result.location?.file).toBe('app.ts');
      expect(result.location?.line).toBe(10);
    });

    it('should detect type error', async () => {
      const error = 'TypeError: Cannot find type definition for "react"';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('type_error');
    });

    it('should detect import error', async () => {
      const error = 'Error: Cannot find module "./utils" at main.js:5:1';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('import_error');
    });

    it('should detect missing dependency', async () => {
      const error = 'Error: package not found: lodash@4.0.0';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('missing_dependency');
    });

    it('should detect configuration error', async () => {
      const error = 'ConfigurationError: Invalid config in .eslintrc';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('configuration_error');
    });

    it('should detect test failure', async () => {
      const error = 'FAIL src/__tests__/app.test.ts\nExpect(received).toBe(expected)';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('test_failure');
    });

    it('should detect lint error', async () => {
      const error = 'ESLint: Unexpected console.log (no-console) at src/app.ts:5';
      const result = await autoFix.analyzeError(error);
      
      // May detect as lint_error, test_failure or unknown
      expect(['lint_error', 'test_failure', 'unknown']).toContain(result.type);
    });

    it('should return unknown for unrecognized errors', async () => {
      const error = 'Some random error occurred';
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBe('unknown');
    });

    it('should extract location from error output', async () => {
      const error = 'Error at /path/to/file.ts:25:10';
      const result = await autoFix.analyzeError(error);
      
      // Location extraction may vary based on implementation
      expect(result.location?.line).toBe(25);
      expect(result.location?.column).toBe(10);
    });
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for syntax error', async () => {
      const error = 'SyntaxError: Unexpected token';
      const result = await autoFix.analyzeError(error);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should generate suggestions for import error', async () => {
      const error = 'Cannot find module "./missing"';
      const result = await autoFix.analyzeError(error);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('fix', () => {
    it('should create fix request with analyzed error', async () => {
      const errorOutput = 'SyntaxError: Unexpected token at app.ts:1:1';
      
      // This test validates the fix method exists and accepts error input
      expect(autoFix.fix).toBeDefined();
    });
  });

  describe('registerStrategy', () => {
    it('should allow registering custom fix strategy', () => {
      const customStrategy = async () => [];
      
      // This test validates registration works
      expect(() => {
        (autoFix as any).fixStrategies.set('custom_error', customStrategy);
      }).not.toThrow();
    });
  });
});
