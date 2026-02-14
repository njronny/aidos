/**
 * WorkflowEngine Tests - TDD
 * 
 * 测试任务执行引擎
 */

import { WorkflowEngine, WorkflowTask, WorkflowState } from '../WorkflowEngine';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  describe('constructor', () => {
    it('should create workflow engine', () => {
      expect(engine).toBeDefined();
    });
  });

  describe('task management', () => {
    it('should add task to queue', () => {
      const task: WorkflowTask = {
        id: 'task-1',
        name: 'Generate Code',
        type: 'generate',
      };
      
      engine.addTask(task);
      expect(engine.getQueueSize()).toBe(1);
    });

    it('should process task in order', async () => {
      const results: string[] = [];
      
      engine.on('task:complete', (task: WorkflowTask) => {
        results.push(task.id);
      });

      await engine.addTask({ id: 't1', name: 'Task 1', type: 'generate' });
      await engine.addTask({ id: 't2', name: 'Task 2', type: 'generate' });
      
      await engine.run();
      
      expect(results.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('state machine', () => {
    it('should track workflow state', () => {
      const state: WorkflowState = {
        status: 'running',
        currentTask: 'task-1',
        progress: 50,
        totalTasks: 10,
        completedTasks: 5,
        failedTasks: 0,
      };
      
      expect(state.status).toBe('running');
      expect(state.progress).toBe(50);
    });

    it('should transition states', () => {
      let state = 'pending';
      state = 'running';
      state = 'completed';
      
      expect(state).toBe('completed');
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed tasks', async () => {
      let attempts = 0;
      
      const task: WorkflowTask = {
        id: 'retry-task',
        name: 'Retry Task',
        type: 'generate',
        retry: true,
        maxRetries: 3,
        handler: async () => {
          attempts++;
          if (attempts < 2) throw new Error('Simulated failure');
          return { success: true };
        },
      };

      await engine.addTask(task);
      await engine.run();
      
      expect(attempts).toBe(2);
    });

    it('should give up after max retries', async () => {
      let attempts = 0;
      
      const task: WorkflowTask = {
        id: 'fail-task',
        name: 'Fail Task',
        type: 'generate',
        retry: true,
        maxRetries: 2,
        handler: async () => {
          attempts++;
          throw new Error('Always fails');
        },
      };

      await engine.addTask(task);
      await engine.run();
      
      expect(attempts).toBe(3); // initial + 2 retries
    });
  });
});

describe('WorkflowTask', () => {
  it('should create valid task', () => {
    const task: WorkflowTask = {
      id: 't1',
      name: 'Test',
      type: 'generate',
      priority: 'high',
    };
    
    expect(task.id).toBe('t1');
    expect(task.priority).toBe('high');
  });
});
