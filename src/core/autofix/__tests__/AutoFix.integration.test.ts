/**
 * AutoFix 集成测试
 */

import { AutoFix } from '../AutoFix';

describe('AutoFix Integration', () => {
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

  describe('Error Analysis', () => {
    it('should analyze common TypeScript errors', async () => {
      const error = "TS2307: Cannot find module './components'";
      const result = await autoFix.analyzeError(error);
      
      expect(result.type).toBeDefined();
    });

    it('should analyze ESLint errors', async () => {
      const error = "ESLint: error no-console";
      const result = await autoFix.analyzeError(error);
      
      expect(result.suggestions).toBeDefined();
    });

    it('should extract error location', async () => {
      const error = "Error at src/app.ts:10:5";
      const result = await autoFix.analyzeError(error);
      
      expect(result.location).toBeDefined();
    });
  });

  describe('Fix Suggestions', () => {
    it('should generate suggestions for syntax errors', async () => {
      const error = 'SyntaxError: Unexpected token';
      const analysis = await autoFix.analyzeError(error);
      
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should generate suggestions for import errors', async () => {
      const error = "Cannot find module './utils'";
      const analysis = await autoFix.analyzeError(error);
      
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('should generate suggestions for missing dependencies', async () => {
      const error = "Cannot find package 'lodash'";
      const analysis = await autoFix.analyzeError(error);
      
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should support retry configuration', () => {
      const af = new AutoFix({ maxRetries: 5 });
      expect((af as any).config.maxRetries).toBe(5);
    });

    it('should support backup configuration', () => {
      const af = new AutoFix({ backupBeforeFix: false });
      expect((af as any).config.backupBeforeFix).toBe(false);
    });
  });
});
