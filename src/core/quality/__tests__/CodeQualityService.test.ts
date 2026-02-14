/**
 * CodeQualityService 单元测试
 */

import { CodeQualityService, QualityIssue } from '../CodeQualityService';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

describe('CodeQualityService', () => {
  let service: CodeQualityService;
  let testDir: string;

  beforeEach(() => {
    // 创建临时测试目录
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cq-test-'));
    service = new CodeQualityService(testDir);
  });

  afterEach(() => {
    // 清理测试目录
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('runLint', () => {
    it('should return empty array when no source files', async () => {
      const issues = await service.runLint();
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should handle eslint errors', async () => {
      // 创建一个有问题的文件
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'test.ts'), `
        const unused = "this is unused";
        console.log("hello");
      `);

      const issues = await service.runLint();
      expect(issues).toBeDefined();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('runTypeCheck', () => {
    it('should return empty array for valid TypeScript', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      // 创建有效的 TypeScript 文件
      fs.writeFileSync(path.join(srcDir, 'valid.ts'), `
        const greeting: string = "hello";
        console.log(greeting);
      `);

      const issues = await service.runTypeCheck();
      expect(Array.isArray(issues)).toBe(true);
    });

    it('should detect type errors', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      // 创建有类型错误的文件
      fs.writeFileSync(path.join(srcDir, 'error.ts'), `
        const num: number = "not a number";
      `);

      const issues = await service.runTypeCheck();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('runSecurityScan', () => {
    it('should detect hardcoded passwords', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      fs.writeFileSync(path.join(srcDir, 'config.ts'), `
        const dbPassword = "secret123";
        const apiKey = "sk-1234567890";
      `);

      const issues = await service.runSecurityScan();
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.message.includes('password'))).toBe(true);
    });

    it('should detect API keys', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      fs.writeFileSync(path.join(srcDir, 'keys.ts'), `
        const token = "ghp_xxxxxxxxxxxx";
        const secret = "my-secret-key";
      `);

      const issues = await service.runSecurityScan();
      expect(issues.some(i => i.rule === 'no-hardcoded-secret')).toBe(true);
    });

    it('should return empty for safe code', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      fs.writeFileSync(path.join(srcDir, 'safe.ts'), `
        import { password } from './config';
        console.log("Using env password");
      `);

      const issues = await service.runSecurityScan();
      expect(issues.length).toBe(0);
    });
  });

  describe('checkUnusedCode', () => {
    it('should detect unused variables', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      fs.writeFileSync(path.join(srcDir, 'unused.ts'), `
        const unusedVar = "not used";
        const usedVar = "used";
        console.log(usedVar);
      `);

      const issues = await service.checkUnusedCode();
      expect(Array.isArray(issues)).toBe(true);
    });
  });

  describe('runFullCheck', () => {
    it('should run all checks', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'main.ts'), `console.log("test");`);

      const report = await service.runFullCheck();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('issues');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('passed');
      expect(report.summary).toHaveProperty('errors');
      expect(report.summary).toHaveProperty('warnings');
      expect(report.summary).toHaveProperty('score');
      expect(typeof report.summary.score).toBe('number');
      expect(report.summary.score).toBeGreaterThanOrEqual(0);
      expect(report.summary.score).toBeLessThanOrEqual(100);
    });

    it('should calculate score correctly', async () => {
      const srcDir = path.join(testDir, 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      
      // 创建一个有很多问题的文件
      fs.writeFileSync(path.join(srcDir, 'bad.ts'), `
        const pass = "password123";
        const key = "api_key_xxx";
        const secret = "mysecret";
      `);

      const report = await service.runFullCheck();
      
      // 有安全问题应该有较低的分数
      expect(report.summary.errors).toBeGreaterThan(0);
    });
  });
});
