/**
 * EnhancedRequirementsAnalyzer Tests - LLM-powered
 * 
 * 测试 LLM 增强的需求分析能力
 */

import { EnhancedRequirementsAnalyzer, AcceptanceCriteria, EnhancedTask } from '../../EnhancedRequirementsAnalyzer';
import { LLMService } from '../../../llm';
import { LLMConfig } from '../../../llm/types';

const mockLLMConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
};

describe('EnhancedRequirementsAnalyzer', () => {
  let analyzer: EnhancedRequirementsAnalyzer;
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService(mockLLMConfig);
    analyzer = new EnhancedRequirementsAnalyzer(llmService);
  });

  describe('constructor', () => {
    it('should create analyzer with LLM service', () => {
      expect(analyzer).toBeDefined();
    });

    it('should throw if no LLM service provided', () => {
      expect(() => {
        new EnhancedRequirementsAnalyzer(undefined as any);
      }).toThrow('LLM service is required');
    });
  });

  describe('analyzeWithLLM', () => {
    it('should analyze requirement with LLM semantic understanding', async () => {
      const requirement = '用户需要能够通过手机号注册账号，并收到验证码';
      
      const result = await analyzer.analyzeWithLLM(requirement);
      
      expect(result).toHaveProperty('requirement');
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('entities');
      expect(result).toHaveProperty('suggestions');
    });

    it('should extract business entities from requirement', async () => {
      const requirement = '实现一个在线书店系统，用户可以浏览图书、加入购物车、下单购买';
      
      const result = await analyzer.analyzeWithLLM(requirement);
      
      // Should identify entities like: 用户, 图书, 购物车, 订单
      expect(result.entities.length).toBeGreaterThan(0);
    });

    it('should understand implicit requirements', async () => {
      const requirement = '做一个和淘宝类似的电商网站';
      
      const result = await analyzer.analyzeWithLLM(requirement);
      
      // Should identify this as e-commerce with implicit needs
      expect(result.intent).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('generateAcceptanceCriteria', () => {
    it('should generate acceptance criteria from requirement', async () => {
      const requirement = '用户登录功能';
      
      const criteria = await analyzer.generateAcceptanceCriteria(requirement);
      
      expect(Array.isArray(criteria)).toBe(true);
      expect(criteria.length).toBeGreaterThan(0);
      
      // Each criteria should have description and testable condition
      criteria.forEach((c: AcceptanceCriteria) => {
        expect(c).toHaveProperty('description');
        expect(c).toHaveProperty('testable');
      });
    });

    it('should generate testable acceptance criteria', async () => {
      const requirement = '用户注册功能需要发送验证码';
      
      const criteria = await analyzer.generateAcceptanceCriteria(requirement);
      
      // At least one criteria should be testable
      const testableCriteria = criteria.filter((c: AcceptanceCriteria) => c.testable);
      expect(testableCriteria.length).toBeGreaterThan(0);
    });

    it('should generate criteria with priority', async () => {
      const requirement = '实现支付功能';
      
      const criteria = await analyzer.generateAcceptanceCriteria(requirement);
      
      criteria.forEach((c: AcceptanceCriteria) => {
        expect(c).toHaveProperty('priority');
      });
    });
  });

  describe('enhanceTaskTemplates', () => {
    it('should enhance task templates with LLM suggestions', async () => {
      const baseTasks = [
        { title: '创建用户表', description: '设计用户数据库表结构', type: 'database' as const },
      ];
      
      const enhanced = await analyzer.enhanceTaskTemplates(baseTasks);
      
      expect(enhanced.length).toBe(baseTasks.length);
      enhanced.forEach((task: EnhancedTask) => {
        expect(task).toHaveProperty('subtasks');
        expect(task).toHaveProperty('implementationNotes');
      });
    });

    it('should add subtasks for complex tasks', async () => {
      const baseTasks = [
        { title: '实现API接口', description: '开发REST API', type: 'backend' as const },
      ];
      
      const enhanced = await analyzer.enhanceTaskTemplates(baseTasks);
      
      // Should add more detailed subtasks
      expect(enhanced[0].subtasks?.length).toBeGreaterThan(0);
    });
  });

  describe('generatePRD', () => {
    it('should generate structured PRD from requirement', async () => {
      const requirement = '开发一个任务管理应用，支持创建任务、分配负责人、设置截止日期';
      
      const prd = await analyzer.generatePRD(requirement);
      
      expect(prd).toHaveProperty('title');
      expect(prd).toHaveProperty('background');
      expect(prd).toHaveProperty('functionalRequirements');
      expect(prd).toHaveProperty('nonFunctionalRequirements');
      expect(prd).toHaveProperty('acceptanceCriteria');
    });

    it('should include technical suggestions in PRD', async () => {
      const requirement = '高并发的实时聊天系统';
      
      const prd = await analyzer.generatePRD(requirement);
      
      // Should include technical considerations
      expect(prd.nonFunctionalRequirements.length).toBeGreaterThan(0);
    });
  });
});

describe('AcceptanceCriteria', () => {
  it('should create valid acceptance criteria', () => {
    const criteria: AcceptanceCriteria = {
      id: 'AC-001',
      description: '用户能够登录',
      testable: true,
      priority: 'high',
      testCases: ['输入正确账号密码能登录', '输入错误密码不能登录'],
    };
    
    expect(criteria.id).toBe('AC-001');
    expect(criteria.testable).toBe(true);
  });
});
