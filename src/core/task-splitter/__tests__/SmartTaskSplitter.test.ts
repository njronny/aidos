/**
 * SmartTaskSplitter Tests - TDD
 * 
 * 测试智能任务拆分能力
 */

import { SmartTaskSplitter, SplitTask, TaskComplexity } from '../SmartTaskSplitter';
import { LLMService } from '../../llm';
import { LLMConfig } from '../../llm/types';

const mockLLMConfig: LLMConfig = {
  provider: 'openai',
  apiKey: 'test-key',
  model: 'gpt-4',
};

describe('SmartTaskSplitter', () => {
  let splitter: SmartTaskSplitter;
  let llmService: LLMService;

  beforeEach(() => {
    llmService = new LLMService(mockLLMConfig);
    splitter = new SmartTaskSplitter(llmService);
  });

  describe('constructor', () => {
    it('should create splitter with LLM service', () => {
      expect(splitter).toBeDefined();
    });

    it('should throw if no LLM service', () => {
      expect(() => {
        new SmartTaskSplitter(undefined as any);
      }).toThrow('LLM service is required');
    });
  });

  describe('splitTask', () => {
    it('should split complex task into subtasks', async () => {
      const task = {
        id: 'task-001',
        title: '实现用户模块',
        description: '包括用户注册、登录、个人中心',
        type: 'backend' as const,
      };

      const result = await splitter.splitTask(task);

      expect(result.subtasks.length).toBeGreaterThan(1);
      expect(result.dependencies.size).toBeGreaterThan(0);
    });

    it('should generate code-level tasks', async () => {
      const task = {
        id: 'task-002',
        title: '创建REST API',
        description: '实现用户 CRUD 接口',
        type: 'backend' as const,
      };

      const result = await splitter.splitTask(task);

      // Should have file-level or function-level tasks
      const hasSpecificTasks = result.subtasks.some(t => 
        t.title.includes('创建') || t.title.includes('实现') || t.title.includes('编写')
      );
      expect(hasSpecificTasks).toBe(true);
    });

    it('should identify parallelizable tasks', async () => {
      const task = {
        id: 'task-003',
        title: '前端页面开发',
        description: '开发登录页、注册页、个人中心页',
        type: 'frontend' as const,
      };

      const result = await splitter.splitTask(task);

      expect(result.parallelGroups.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeComplexity', () => {
    it('should analyze task complexity', async () => {
      const task = {
        id: 'task-004',
        title: '简单功能',
        description: '一个简单的 hello world',
        type: 'backend' as const,
      };

      const complexity = await splitter.analyzeComplexity(task);

      expect(complexity).toHaveProperty('score');
      expect(complexity).toHaveProperty('level');
      expect(['simple', 'medium', 'complex']).toContain(complexity.level);
    });

    it('should rate complex tasks higher', async () => {
      const simpleTask = {
        id: 'task-005',
        title: '简单任务',
        description: '打印 hello',
        type: 'backend' as const,
      };

      const complexTask = {
        id: 'task-006',
        title: '复杂任务',
        description: '实现分布式事务处理系统',
        type: 'backend' as const,
      };

      const simpleComplexity = await splitter.analyzeComplexity(simpleTask);
      const complexComplexity = await splitter.analyzeComplexity(complexTask);

      expect(complexComplexity.score).toBeGreaterThanOrEqual(simpleComplexity.score);
    });
  });

  describe('estimateDuration', () => {
    it('should estimate task duration', async () => {
      const task = {
        id: 'task-007',
        title: '开发API',
        description: '实现用户管理 API',
        type: 'backend' as const,
      };

      const estimate = await splitter.estimateDuration(task);

      expect(estimate).toHaveProperty('minutes');
      expect(estimate.minutes).toBeGreaterThan(0);
      expect(estimate).toHaveProperty('confidence');
    });

    it('should give higher estimate for complex tasks', async () => {
      const simpleTask = {
        id: 'task-008',
        title: '简单API',
        description: '一个简单接口',
        type: 'backend' as const,
      };

      const complexTask = {
        id: 'task-009',
        title: '复杂API',
        description: '多表关联的CRUD API',
        type: 'backend' as const,
      };

      const simpleEstimate = await splitter.estimateDuration(simpleTask);
      const complexEstimate = await splitter.estimateDuration(complexTask);

      expect(complexEstimate.minutes).toBeGreaterThanOrEqual(simpleEstimate.minutes);
    });
  });

  describe('identifyDependencies', () => {
    it('should identify task dependencies', async () => {
      const tasks = [
        { id: 'task-a', title: '创建数据库表', description: '设计数据库', type: 'database' as const },
        { id: 'task-b', title: '实现后端API', description: '后端开发', type: 'backend' as const },
        { id: 'task-c', title: '开发前端页面', description: '前端开发', type: 'frontend' as const },
      ];

      const dependencies = splitter.identifyDependencies(tasks);

      expect(dependencies.size).toBeGreaterThan(0);
    });

    it('should handle data flow dependencies', async () => {
      const tasks = [
        { id: 'task-1', title: '设计数据库', description: '数据库设计', type: 'database' as const },
        { id: 'task-2', title: '后端开发', description: '后端实现', type: 'backend' as const },
        { id: 'task-3', title: '前端开发', description: '前端实现', type: 'frontend' as const },
      ];

      const dependencies = splitter.identifyDependencies(tasks);

      // Database should come before backend
      const dbDeps = dependencies.get('task-1') || [];
      // task-2 depends on task-1
      expect(dependencies.get('task-2')?.includes('task-1')).toBe(true);
    });
  });

  describe('optimizeExecutionOrder', () => {
    it('should optimize task execution order', async () => {
      const tasks = [
        { id: 'task-x', title: '前端', description: '前端开发', type: 'frontend' as const },
        { id: 'task-y', title: '后端', description: '后端开发', type: 'backend' as const },
        { id: 'task-z', title: '数据库', description: '数据库开发', type: 'database' as const },
      ];

      const optimized = await splitter.optimizeExecutionOrder(tasks);

      expect(optimized.length).toBe(tasks.length);
      // Should have database somewhere in the list
      const hasDb = optimized.some(t => t.type === 'database');
      expect(hasDb).toBe(true);
    });
  });
});

describe('TaskComplexity', () => {
  it('should create valid complexity object', () => {
    const complexity: TaskComplexity = {
      score: 8.5,
      level: 'complex',
      factors: {
        codeSize: 5,
        dependencyComplexity: 3,
        algorithmComplexity: 4,
        testComplexity: 3,
      },
    };

    expect(complexity.score).toBe(8.5);
    expect(complexity.level).toBe('complex');
  });
});
