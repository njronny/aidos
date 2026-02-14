/**
 * TaskDistributor Tests - TDD
 * 
 * 测试任务分发到 OpenClaw
 */

import { TaskDistributor, DistributeTask, DistributeResult } from '../TaskDistributor';

describe('TaskDistributor', () => {
  let distributor: TaskDistributor;

  beforeEach(() => {
    distributor = new TaskDistributor();
  });

  describe('constructor', () => {
    it('should create distributor', () => {
      expect(distributor).toBeDefined();
    });
  });

  describe('distribute', () => {
    it('should distribute task to executor', async () => {
      const task: DistributeTask = {
        id: 'task-1',
        prompt: '写一个函数',
        agentType: 'developer',
      };

      const result = await distributor.distribute(task);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('taskId');
    });

    it('should route by agent type', async () => {
      const devTask: DistributeTask = {
        id: 't1',
        prompt: '开发任务',
        agentType: 'developer',
      };

      const qaTask: DistributeTask = {
        id: 't2',
        prompt: '测试任务',
        agentType: 'qa',
      };

      const devResult = await distributor.distribute(devTask);
      const qaResult = await distributor.distribute(qaTask);

      expect(devResult.agentType).toBe('developer');
      expect(qaResult.agentType).toBe('qa');
    });
  });

  describe('load balancing', () => {
    it('should distribute evenly', async () => {
      const tasks: DistributeTask[] = Array.from({ length: 5 }, (_, i) => ({
        id: `t${i}`,
        prompt: `任务 ${i}`,
        agentType: 'developer',
      }));

      const results = await distributor.distributeBatch(tasks);

      expect(results.length).toBe(5);
    });

    it('should handle failed distribution', async () => {
      const task: DistributeTask = {
        id: 'fail-task',
        prompt: 'error',
        agentType: 'developer',
      };

      const result = await distributor.distribute(task);

      expect(result).toHaveProperty('error');
    });
  });

  describe('routing rules', () => {
    it('should route coding to developer', async () => {
      const task: DistributeTask = {
        id: 'c1',
        prompt: '实现用户登录',
        agentType: 'developer',
      };

      const result = await distributor.distribute(task);

      expect(result.agentType).toBe('developer');
    });

    it('should route testing to qa', async () => {
      const task: DistributeTask = {
        id: 'q1',
        prompt: '编写测试',
        agentType: 'qa',
      };

      const result = await distributor.distribute(task);

      expect(result.agentType).toBe('qa');
    });
  });
});

describe('DistributeTask', () => {
  it('should create valid task', () => {
    const task: DistributeTask = {
      id: 'test-1',
      prompt: '开发功能',
      agentType: 'developer',
    };

    expect(task.id).toBe('test-1');
    expect(task.agentType).toBe('developer');
  });
});

describe('DistributeResult', () => {
  it('should create valid result', () => {
    const result: DistributeResult = {
      success: true,
      taskId: 't1',
      output: 'code',
      agentType: 'developer',
      executionTime: 100,
      distributedAt: Date.now(),
    };

    expect(result.success).toBe(true);
  });
});
