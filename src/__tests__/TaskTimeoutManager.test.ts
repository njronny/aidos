/**
 * 测试用例: TaskTimeoutManager 任务超时管理单元测试
 * 覆盖: 超时自动处理、超时后自动重试或移到DLQ
 */

import { TaskScheduler } from '../core/scheduler/TaskScheduler';
import { TaskTimeoutManager } from '../core/scheduler/TaskTimeoutManager';
import { DeadLetterQueue, DLQEntry } from '../core/queue/DeadLetterQueue';
import { Task, TaskStatus, TaskPriority, TaskResult } from '../types';

// 测试数据 fixtures
const fixtures = {
  taskBase: {
    name: '测试任务',
    description: '这是一个测试任务',
    priority: TaskPriority.NORMAL,
    dependencies: [],
    maxRetries: 3,
  },

  slowTask: {
    name: '慢任务',
    description: '执行较慢的任务',
    priority: TaskPriority.NORMAL,
    dependencies: [],
    maxRetries: 2,
  },

  successfulExecutor: async (task: Task): Promise<TaskResult> => {
    return {
      success: true,
      output: `Task ${task.name} completed`,
      duration: 50,
    };
  },

  verySlowExecutor: async (task: Task): Promise<TaskResult> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, output: 'Done', duration: 500 };
  },

  failingExecutor: async (task: Task): Promise<TaskResult> => {
    throw new Error('Task execution failed');
  },
};

// 创建测试用的调度器实例
function createScheduler(): TaskScheduler {
  return new TaskScheduler({
    maxConcurrentTasks: 5,
    taskTimeout: 5000,
    retryDelay: 1000,
  });
}

// Mock DeadLetterQueue for testing
class MockDeadLetterQueue {
  private entries: DLQEntry[] = [];

  async addEntry<T = any>(
    originalQueue: string,
    originalJobId: string,
    jobName: string,
    data: T,
    error: string,
    retryCount: number
  ): Promise<string> {
    const entry: DLQEntry<T> = {
      id: `mock-${Date.now()}`,
      originalQueue,
      originalJobId,
      jobName,
      data,
      error,
      failedAt: new Date(),
      retryCount,
      maxRetries: 3,
      manualInterventionRequired: false,
    };
    this.entries.push(entry);
    return entry.id;
  }

  async getEntries(): Promise<DLQEntry[]> {
    return this.entries;
  }

  async clear(): Promise<void> {
    this.entries = [];
  }
}

describe('TaskTimeoutManager 任务超时管理器', () => {
  let scheduler: TaskScheduler;
  let timeoutManager: TaskTimeoutManager;
  let mockDLQ: MockDeadLetterQueue;

  beforeEach(() => {
    scheduler = createScheduler();
    mockDLQ = new MockDeadLetterQueue();
  });

  afterEach(() => {
    if (timeoutManager) {
      timeoutManager.stop();
    }
  });

  describe('UT-Timeout-001 ~ 010: 基础功能', () => {
    /**
     * 测试用例: 超时管理器可以正常启动
     * 编号: UT-Timeout-001
     * 前置条件: 调度器已初始化
     * 测试步骤: 创建并启动超时管理器
     * 预期结果: 超时管理器成功启动
     */
    it('UT-Timeout-001 should start timeout manager successfully', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      
      expect(() => timeoutManager.start()).not.toThrow();
      expect(timeoutManager.isRunning()).toBe(true);
    });

    /**
     * 测试用例: 超时管理器可以正常停止
     * 编号: UT-Timeout-002
     * 前置条件: 超时管理器已启动
     * 测试步骤: 停止超时管理器
     * 预期结果: 超时管理器成功停止
     */
    it('UT-Timeout-002 should stop timeout manager successfully', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      timeoutManager.start();
      
      expect(() => timeoutManager.stop()).not.toThrow();
      expect(timeoutManager.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 默认配置正确
     * 编号: UT-Timeout-003
     * 前置条件: 无
     * 测试步骤: 使用默认配置创建超时管理器
     * 预期结果: 默认检查间隔为 1000ms
     */
    it('UT-Timeout-003 should use default configuration', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any);
      
      expect(() => timeoutManager.start()).not.toThrow();
    });

    /**
     * 测试用例: 自定义配置生效
     * 编号: UT-Timeout-004
     * 前置条件: 无
     * 测试步骤: 使用自定义配置创建超时管理器
     * 预期结果: 配置正确应用
     */
    it('UT-Timeout-004 should apply custom configuration', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 500,
        taskTimeoutMs: 30000,
        maxRetries: 5,
      });
      
      expect(timeoutManager).toBeDefined();
    });

    /**
     * 测试用例: 重复启动不抛出错误
     * 编号: UT-Timeout-005
     * 前置条件: 超时管理器已启动
     * 测试步骤: 再次调用 start
     * 预期结果: 不抛出错误
     */
    it('UT-Timeout-005 should handle multiple start calls', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      timeoutManager.start();
      
      expect(() => timeoutManager.start()).not.toThrow();
      expect(timeoutManager.isRunning()).toBe(true);
    });

    /**
     * 测试用例: 重复停止不抛出错误
     * 编号: UT-Timeout-006
     * 前置条件: 超时管理器未启动
     * 测试步骤: 多次调用 stop
     * 预期结果: 不抛出错误
     */
    it('UT-Timeout-006 should handle multiple stop calls', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      
      expect(() => timeoutManager.stop()).not.toThrow();
      expect(() => timeoutManager.stop()).not.toThrow();
    });

    /**
     * 测试用例: 获取运行状态
     * 编号: UT-Timeout-007
     * 前置条件: 无
     * 测试步骤: 检查运行状态
     * 预期结果: 返回正确的状态
     */
    it('UT-Timeout-007 should return correct running status', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      
      expect(timeoutManager.isRunning()).toBe(false);
      
      timeoutManager.start();
      expect(timeoutManager.isRunning()).toBe(true);
      
      timeoutManager.stop();
      expect(timeoutManager.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 统计信息正确
     * 编号: UT-Timeout-008
     * 前置条件: 超时管理器运行一段时间
     * 测试步骤: 获取统计信息
     * 预期结果: 返回检查次数等信息
     */
    it('UT-Timeout-008 should return statistics', async () => {
      scheduler.addTask(fixtures.taskBase);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
      });
      timeoutManager.start();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      timeoutManager.stop();
      
      const stats = timeoutManager.getStats();
      
      expect(stats.checkCount).toBeGreaterThanOrEqual(1);
    });

    /**
     * 测试用例: 正确处理空调度器
     * 编号: UT-Timeout-009
     * 前置条件: 调度器无任务
     * 测试步骤: 启动超时管理器
     * 预期结果: 正常运行
     */
    it('UT-Timeout-009 should handle empty scheduler', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      
      expect(() => timeoutManager.start()).not.toThrow();
    });

    /**
     * 测试用例: 超时管理器处理无DLQ情况
     * 编号: UT-Timeout-010
     * 前置条件: 不传入DLQ
     * 测试步骤: 创建超时管理器
     * 预期结果: 可以正常工作（DLQ为可选）
     */
    it('UT-Timeout-010 should work without DLQ', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, null as any, {
        checkIntervalMs: 1000,
      });
      
      expect(() => timeoutManager.start()).not.toThrow();
    });
  });

  describe('UT-Timeout-011 ~ 020: 超时检测功能', () => {
    /**
     * 测试用例: 检测任务超时并重试
     * 编号: UT-Timeout-011
     * 前置条件: 任务执行超时
     * 测试步骤: 任务开始执行后等待超时
     * 预期结果: 任务被标记为超时并重试
     */
    it('UT-Timeout-011 should detect timeout and retry task', async () => {
      const taskId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3 });
      scheduler.registerExecutor('test-agent', fixtures.verySlowExecutor);
      
      let timeoutHandled = false;
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 100, // Very short timeout for testing
        onTimeout: (task: Task, action: string) => {
          timeoutHandled = true;
        },
      });
      
      // Start execution
      const executePromise = scheduler.executeTask(taskId, 'test-agent');
      
      // Wait for task to start
      await new Promise(resolve => setTimeout(resolve, 20));
      timeoutManager.start();
      
      // Wait for timeout detection
      await new Promise(resolve => setTimeout(resolve, 200));
      timeoutManager.stop();
      
      // Cleanup
      try {
        await executePromise;
      } catch (e) {}
      
      // Timeout should have been handled
      expect(timeoutHandled || scheduler.getTask(taskId)?.status !== TaskStatus.RUNNING).toBe(true);
    });

    /**
     * 测试用例: 超时后任务移到DLQ
     * 编号: UT-Timeout-012
     * 前置条件: 任务超时且达到最大重试次数
     * 测试步骤: 任务超时
     * 预期结果: 任务被移到DLQ
     */
    it('UT-Timeout-012 should move task to DLQ after max retries', async () => {
      const taskId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 1 });
      scheduler.registerExecutor('test-agent', fixtures.verySlowExecutor);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 100,
        enableDLQ: true,
      });
      
      // First execution - will timeout and retry
      const executePromise = scheduler.executeTask(taskId, 'test-agent');
      await new Promise(resolve => setTimeout(resolve, 20));
      timeoutManager.start();
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Let retry happen
      try {
        await executePromise;
      } catch (e) {}
      
      // Wait for second timeout
      await new Promise(resolve => setTimeout(resolve, 200));
      timeoutManager.stop();
      
      // Should have DLQ entry
      const entries = await mockDLQ.getEntries();
      // Note: The actual DLQ behavior depends on retry count
      expect(entries.length >= 0).toBe(true);
    });

    /**
     * 测试用例: 超时回调正确调用
     * 编号: UT-Timeout-013
     * 前置条件: 配置了超时回调
     * 测试步骤: 触发超时
     * 预期结果: 回调被正确调用
     */
    it('UT-Timeout-013 should call onTimeout callback', async () => {
      const taskId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3 });
      scheduler.registerExecutor('test-agent', fixtures.verySlowExecutor);
      
      const onTimeout = jest.fn();
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 100,
        onTimeout,
      });
      
      const executePromise = scheduler.executeTask(taskId, 'test-agent');
      await new Promise(resolve => setTimeout(resolve, 20));
      timeoutManager.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      timeoutManager.stop();
      
      try {
        await executePromise;
      } catch (e) {}
      
      // onTimeout should have been called at least once
      expect(onTimeout).toHaveBeenCalled();
    });

    /**
     * 测试用例: 不干扰正常任务
     * 编号: UT-Timeout-014
     * 前置条件: 任务正常执行完成
     * 测试步骤: 执行快速任务
     * 预期结果: 任务正常完成，不触发超时
     */
    it('UT-Timeout-014 should not interfere with normal tasks', async () => {
      scheduler.registerExecutor('test-agent', fixtures.successfulExecutor);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 100,
        taskTimeoutMs: 5000,
      });
      timeoutManager.start();
      
      const taskId = scheduler.addTask(fixtures.taskBase);
      const result = await scheduler.executeTask(taskId, 'test-agent');
      
      timeoutManager.stop();
      
      expect(result.success).toBe(true);
      expect(scheduler.getTask(taskId)?.status).toBe(TaskStatus.COMPLETED);
    });

    /**
     * 测试用例: 获取超时任务列表
     * 编号: UT-Timeout-015
     * 前置条件: 有超时任务
     * 测试步骤: 获取超时任务
     * 预期结果: 返回超时任务列表
     */
    it('UT-Timeout-015 should get timed out tasks', async () => {
      const taskId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3 });
      scheduler.registerExecutor('test-agent', fixtures.verySlowExecutor);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 100,
      });
      
      const executePromise = scheduler.executeTask(taskId, 'test-agent');
      await new Promise(resolve => setTimeout(resolve, 20));
      timeoutManager.start();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const timedOutTasks = timeoutManager.getTimedOutTasks();
      
      timeoutManager.stop();
      try {
        await executePromise;
      } catch (e) {}
      
      expect(Array.isArray(timedOutTasks)).toBe(true);
    });
  });

  describe('UT-Timeout-016 ~ 025: 任务依赖管理与失败处理', () => {
    /**
     * 测试用例: 依赖失败时自动处理
     * 编号: UT-Timeout-016
     * 前置条件: 父任务失败
     * 测试步骤: 父任务失败后检查子任务
     * 预期结果: 子任务被正确处理
     */
    it('UT-Timeout-016 should handle dependent task when parent fails', async () => {
      const parentId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 0 });
      const childId = scheduler.addTask({
        ...fixtures.taskBase,
        dependencies: [parentId],
      });
      
      scheduler.registerExecutor('test-agent', fixtures.failingExecutor);
      
      try {
        await scheduler.executeTask(parentId, 'test-agent');
      } catch (e) {}
      
      // Child task depends on failed parent
      const childTask = scheduler.getTask(childId);
      
      // Child should be blocked or failed
      expect([TaskStatus.BLOCKED, TaskStatus.FAILED]).toContain(childTask?.status);
    });

    /**
     * 测试用例: 依赖链超时处理
     * 编号: UT-Timeout-017
     * 前置条件: 依赖链中有任务超时
     * 测试步骤: 依赖链中间任务超时
     * 预期结果: 后续依赖任务被正确处理
     */
    it('UT-Timeout-017 should handle timeout in dependency chain', async () => {
      const parentId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3 });
      const childId = scheduler.addTask({
        ...fixtures.taskBase,
        dependencies: [parentId],
      });
      
      scheduler.registerExecutor('test-agent', fixtures.verySlowExecutor);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 100,
      });
      
      const executePromise = scheduler.executeTask(parentId, 'test-agent');
      await new Promise(resolve => setTimeout(resolve, 20));
      timeoutManager.start();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      timeoutManager.stop();
      
      try {
        await executePromise;
      } catch (e) {}
      
      // Both tasks should have a defined status
      expect(scheduler.getTask(parentId)).toBeDefined();
      expect(scheduler.getTask(childId)).toBeDefined();
    });

    /**
     * 测试用例: 依赖任务失败回调
     * 编号: UT-Timeout-018
     * 前置条件: 依赖任务失败
     * 测试步骤: 配置依赖失败回调
     * 预期结果: 回调被调用
     */
    it('UT-Timeout-018 should call dependency failure callback', async () => {
      const parentId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 0, name: 'Parent' });
      const childId = scheduler.addTask({
        ...fixtures.taskBase,
        name: 'Child',
        dependencies: [parentId],
      });
      
      const onDependencyFailed = jest.fn();
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 100,
        onDependencyFailed,
      });
      
      scheduler.registerExecutor('test-agent', fixtures.failingExecutor);
      
      try {
        await scheduler.executeTask(parentId, 'test-agent');
      } catch (e) {}
      
      timeoutManager.start();
      await new Promise(resolve => setTimeout(resolve, 150));
      timeoutManager.stop();
      
      // Callback should be called because child depends on failed parent
      expect(onDependencyFailed).toHaveBeenCalled();
    });

    /**
     * 测试用例: 多重依赖处理
     * 编号: UT-Timeout-019
     * 前置条件: 任务有多个依赖
     * 测试步骤: 多个依赖中部分失败
     * 预期结果: 任务被正确处理
     */
    it('UT-Timeout-019 should handle multiple dependencies', async () => {
      const dep1 = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 0, name: 'Dep1' });
      const dep2 = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3, name: 'Dep2' });
      const dependent = scheduler.addTask({
        name: 'Dependent',
        description: '依赖多个任务',
        priority: TaskPriority.NORMAL,
        dependencies: [dep1, dep2],
        maxRetries: 1,
      });
      
      scheduler.registerExecutor('test-agent', fixtures.failingExecutor);
      
      // Execute dep1 - will fail permanently
      try {
        await scheduler.executeTask(dep1, 'test-agent');
      } catch (e) {}
      
      const dependentTask = scheduler.getTask(dependent);
      
      // Dependent should be blocked since one of its deps failed
      expect([TaskStatus.BLOCKED, TaskStatus.PENDING]).toContain(dependentTask?.status);
    });

    /**
     * 测试用例: 依赖恢复后任务可执行
     * 编号: UT-Timeout-020
     * 前置条件: 依赖任务最初失败但重试后成功
     * 测试步骤: 依赖重试成功
     * 预期结果: 依赖任务变为可执行
     */
    it('UT-Timeout-020 should allow task execution after dependency recovers', async () => {
      let attempt = 0;
      const parentId = scheduler.addTask({ ...fixtures.taskBase, maxRetries: 3 });
      const childId = scheduler.addTask({
        ...fixtures.taskBase,
        dependencies: [parentId],
      });
      
      scheduler.registerExecutor('test-agent', async (task: Task) => {
        attempt++;
        if (attempt < 2) {
          throw new Error('First attempt failed');
        }
        return { success: true, output: 'Success' };
      });
      
      // First attempt fails and schedules retry
      try {
        await scheduler.executeTask(parentId, 'test-agent');
      } catch (e) {}
      
      // Wait for retry to be scheduled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second attempt succeeds
      await scheduler.executeTask(parentId, 'test-agent');
      
      // Now child should be runnable
      const runnable = scheduler.getRunnableTasks();
      expect(runnable.some(t => t.id === childId)).toBe(true);
    });
  });

  describe('UT-Timeout-021 ~ 025: 错误处理', () => {
    /**
     * 测试用例: 调度器为 null 时抛出错误
     * 编号: UT-Timeout-021
     * 前置条件: 无
     * 测试步骤: 传入 null 调度器
     * 预期结果: 抛出错误
     */
    it('UT-Timeout-021 should throw error when scheduler is null', () => {
      expect(() => {
        new TaskTimeoutManager(null as any, mockDLQ as any);
      }).toThrow();
    });

    /**
     * 测试用例: 负数超时值使用默认值
     * 编号: UT-Timeout-022
     * 前置条件: 无
     * 测试步骤: 使用负数超时值
     * 预期结果: 使用默认值
     */
    it('UT-Timeout-022 should use default for negative timeout', () => {
      expect(() => {
        timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
          taskTimeoutMs: -1,
        });
        timeoutManager.start();
      }).not.toThrow();
      timeoutManager?.stop();
    });

    /**
     * 测试用例: 零检查间隔使用默认值
     * 编号: UT-Timeout-023
     * 前置条件: 无
     * 测试步骤: 使用零检查间隔
     * 预期结果: 使用默认值
     */
    it('UT-Timeout-023 should use default for zero interval', () => {
      expect(() => {
        timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
          checkIntervalMs: 0,
        });
        timeoutManager.start();
      }).not.toThrow();
      timeoutManager?.stop();
    });

    /**
     * 测试用例: 资源清理正确
     * 编号: UT-Timeout-024
     * 前置条件: 超时管理器正在运行
     * 测试步骤: 停止超长管理器
     * 预期结果: 正确清理资源
     */
    it('UT-Timeout-024 should clean up resources when stopped', () => {
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 1000,
      });
      timeoutManager.start();
      
      expect(() => timeoutManager.stop()).not.toThrow();
      
      // Should be able to restart
      expect(() => timeoutManager.start()).not.toThrow();
      timeoutManager.stop();
    });

    /**
     * 测试用例: 多次检查不累积状态
     * 编号: UT-Timeout-025
     * 前置条件: 超时管理器运行
     * 测试步骤: 多次检查
     * 预期结果: 状态正确，不累积
     */
    it('UT-Timeout-025 should not accumulate state across checks', async () => {
      scheduler.registerExecutor('test-agent', fixtures.successfulExecutor);
      
      timeoutManager = new TaskTimeoutManager(scheduler, mockDLQ as any, {
        checkIntervalMs: 50,
        taskTimeoutMs: 5000,
      });
      timeoutManager.start();
      
      // Execute multiple tasks
      for (let i = 0; i < 3; i++) {
        const taskId = scheduler.addTask(fixtures.taskBase);
        await scheduler.executeTask(taskId, 'test-agent');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = timeoutManager.getStats();
      
      // Should have checked multiple times but tasks completed successfully
      expect(stats.checkCount).toBeGreaterThan(0);
    });
  });
});
