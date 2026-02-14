/**
 * RequirementsAnalyzer 需求分析器 - TDD 测试
 * 自动将需求拆分为任务列表
 */

import { RequirementsAnalyzer, TaskTemplate, WorkEstimate } from '../RequirementsAnalyzer';

describe('RequirementsAnalyzer', () => {
  let analyzer: RequirementsAnalyzer;

  beforeEach(() => {
    analyzer = new RequirementsAnalyzer();
  });

  describe('constructor', () => {
    it('should create analyzer with default config', () => {
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyzeRequirement', () => {
    it('should reject empty requirement', async () => {
      await expect(analyzer.analyzeRequirement('')).rejects.toThrow('需求描述不能为空');
    });

    it('should analyze simple requirement', async () => {
      const result = await analyzer.analyzeRequirement('创建一个用户登录功能');
      
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('estimatedHours');
      expect(result).toHaveProperty('priority');
      expect(Array.isArray(result.tasks)).toBe(true);
    });

    it('should decompose complex requirement into multiple tasks', async () => {
      const result = await analyzer.analyzeRequirement('创建一个完整的电商系统，包括用户、商品、订单、支付功能');
      
      expect(result.tasks.length).toBeGreaterThan(1);
      
      // 应该包含不同类型的任务
      const taskTypes = result.tasks.map(t => t.type);
      expect(taskTypes).toContain('backend');
      expect(taskTypes).toContain('frontend');
      expect(taskTypes).toContain('database');
    });
  });

  describe('estimateWork', () => {
    it('should provide work estimates', async () => {
      const estimates = await analyzer.estimateWork('实现用户管理模块');
      
      expect(estimates).toHaveProperty('hours');
      expect(estimates).toHaveProperty('complexity');
      expect(estimates).toHaveProperty('risks');
      expect(typeof estimates.hours).toBe('number');
    });

    it('should estimate larger projects with more hours', async () => {
      const small = await analyzer.estimateWork('登录功能');
      const large = await analyzer.estimateWork('完整电商系统');
      
      expect(large.hours).toBeGreaterThan(small.hours);
    });
  });

  describe('suggestPriority', () => {
    it('should suggest priority based on requirement', async () => {
      const priority = await analyzer.suggestPriority('修复支付Bug');
      
      expect(['low', 'medium', 'high', 'critical']).toContain(priority);
    });

    it('should suggest critical for urgent requirements', async () => {
      const priority = await analyzer.suggestPriority('线上数据泄露漏洞');
      
      expect(priority).toBe('critical');
    });
  });

  describe('generateTaskTemplate', () => {
    it('should generate task template', async () => {
      const template = await analyzer.generateTaskTemplate('API开发');
      
      expect(template).toHaveProperty('title');
      expect(template).toHaveProperty('description');
      expect(template).toHaveProperty('type');
      expect(template).toHaveProperty('estimatedHours');
    });

    it('should generate different templates for different types', async () => {
      const apiTemplate = await analyzer.generateTaskTemplate('API开发');
      const feTemplate = await analyzer.generateTaskTemplate('前端开发');
      
      expect(apiTemplate.type).toBe('backend');
      expect(feTemplate.type).toBe('frontend');
    });
  });
});
