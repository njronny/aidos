/**
 * OpenClawExecutor Tests - TDD
 * 
 * 测试调用 OpenClaw 执行任务
 */

import { OpenClawExecutor, OpenClawTask, OpenClawResult } from '../OpenClawExecutor';

describe('OpenClawExecutor', () => {
  let executor: OpenClawExecutor;

  beforeEach(() => {
    executor = new OpenClawExecutor();
  });

  describe('constructor', () => {
    it('should create executor', () => {
      expect(executor).toBeDefined();
    });

    it('should accept custom config', () => {
      const exec = new OpenClawExecutor({ timeout: 30000 });
      expect(exec).toBeDefined();
    });
  });

  describe('execute', () => {
    it('should execute task and return result', async () => {
      const task: OpenClawTask = {
        id: 'task-1',
        prompt: '写一个 hello world 函数',
        agent: 'developer',
      };

      const result = await executor.execute(task);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('output');
      expect(result).toHaveProperty('taskId');
    });

    it('should track task status', async () => {
      const task: OpenClawTask = {
        id: 'task-2',
        prompt: '实现加法函数',
        agent: 'developer',
      };

      await executor.execute(task);
      const status = executor.getTaskStatus('task-2');

      expect(status).toBeDefined();
    });

    it('should handle execution errors', async () => {
      const task: OpenClawTask = {
        id: 'task-3',
        prompt: 'invalid prompt',
        agent: 'developer',
      };

      const result = await executor.execute(task);

      // Should return result even on error
      expect(result).toHaveProperty('taskId');
    });
  });

  describe('batch execute', () => {
    it('should execute multiple tasks', async () => {
      const tasks: OpenClawTask[] = [
        { id: 't1', prompt: '任务1', agent: 'developer' },
        { id: 't2', prompt: '任务2', agent: 'qa' },
      ];

      const results = await executor.executeBatch(tasks);

      expect(results.length).toBe(2);
    });
  });

  describe('context', () => {
    it('should pass context to task', async () => {
      const task: OpenClawTask = {
        id: 'task-c',
        prompt: '使用 TypeScript',
        agent: 'developer',
        context: {
          language: 'typescript',
          framework: 'express',
        },
      };

      const result = await executor.execute(task);

      expect(result.success).toBeDefined();
    });
  });
});

describe('OpenClawTask', () => {
  it('should create valid task', () => {
    const task: OpenClawTask = {
      id: 'test-1',
      prompt: '实现登录',
      agent: 'developer',
    };

    expect(task.id).toBe('test-1');
    expect(task.agent).toBe('developer');
  });
});

describe('OpenClawResult', () => {
  it('should create valid result', () => {
    const result: OpenClawResult = {
      success: true,
      taskId: 'test-1',
      output: 'function login() {}',
      executionTime: 1000,
    };

    expect(result.success).toBe(true);
    expect(result.executionTime).toBe(1000);
  });
});
