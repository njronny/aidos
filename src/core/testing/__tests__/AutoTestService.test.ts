/**
 * AutoTestService 自动测试生成 - TDD 测试
 */

import { AutoTestService, TestType } from '../AutoTestService';

describe('AutoTestService', () => {
  let service: AutoTestService;

  beforeEach(() => {
    service = new AutoTestService();
  });

  describe('generateUnitTest', () => {
    it('should generate unit test for function', async () => {
      const code = `function add(a: number, b: number): number { return a + b; }`;
      
      const test = await service.generateUnitTest(code, 'add');
      
      expect(test).toHaveProperty('name');
      expect(test).toHaveProperty('code');
      expect(test.type).toBe('unit');
    });

    it('should handle invalid code', async () => {
      const code = `invalid code`;
      
      const test = await service.generateUnitTest(code, 'test');
      
      // 无效代码可能也能生成测试，只是质量不高
      expect(test).toHaveProperty('code');
    });
  });

  describe('generateIntegrationTest', () => {
    it('should generate integration test', async () => {
      const apiCode = `
        app.get('/api/users', (req, res) => {
          res.json([]);
        });
      `;
      
      const test = await service.generateIntegrationTest(apiCode);
      
      expect(test).toHaveProperty('code');
    });
  });

  describe('generateE2ETest', () => {
    it('should generate E2E test', async () => {
      const feature = '用户登录功能';
      
      const test = await service.generateE2ETest(feature);
      
      expect(test).toHaveProperty('code');
      expect(test.code).toContain('test');
    });
  });

  describe('runTests', () => {
    it('should run generated tests', async () => {
      const testCode = `
        test('example', () => {
          expect(1 + 1).toBe(2);
        });
      `;
      
      const result = await service.runTests(testCode);
      
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('failed');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate test coverage', async () => {
      const coverage = service.calculateCoverage({
        statements: 100,
        branches: 80,
        functions: 90,
        lines: 95,
      });
      
      expect(coverage).toHaveProperty('total');
      expect(coverage.total).toBeGreaterThan(0);
    });
  });
});
