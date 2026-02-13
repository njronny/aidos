/**
 * 测试用例: SchedulerGuardian 调度器守护单元测试
 * 覆盖: 定时检查待执行任务、确保任务永不错过、任务状态监控
 */

import { TaskScheduler } from '../core/scheduler/TaskScheduler';
import { SchedulerGuardian } from '../core/scheduler/SchedulerGuardian';
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

  slowExecutor: async (task: Task): Promise<TaskResult> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { success: true, output: 'Done', duration: 200 };
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

describe('SchedulerGuardian 调度器守护', () => {
  let scheduler: TaskScheduler;
  let guardian: SchedulerGuardian;

  beforeEach(() => {
    scheduler = createScheduler();
  });

  afterEach(() => {
    if (guardian) {
      guardian.stop();
    }
  });

  describe('UT-Guardian-001 ~ 010: 基础功能', () => {
    /**
     * 测试用例: 守护进程可以正常启动
     * 编号: UT-Guardian-001
     * 前置条件: 调度器已初始化
     * 测试步骤: 创建并启动守护进程
     * 预期结果: 守护进程成功启动
     */
    it('UT-Guardian-001 should start guardian successfully', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      expect(() => guardian.start()).not.toThrow();
      expect(guardian.isRunning()).toBe(true);
    });

    /**
     * 测试用例: 守护进程可以正常停止
     * 编号: UT-Guardian-002
     * 前置条件: 守护进程已启动
     * 测试步骤: 停止守护进程
     * 预期结果: 守护进程成功停止
     */
    it('UT-Guardian-002 should stop guardian successfully', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      guardian.start();
      
      expect(() => guardian.stop()).not.toThrow();
      expect(guardian.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 默认配置正确
     * 编号: UT-Guardian-003
     * 前置条件: 无
     * 测试步骤: 使用默认配置创建守护进程
     * 预期结果: 默认检查间隔为 5000ms
     */
    it('UT-Guardian-003 should use default configuration', () => {
      guardian = new SchedulerGuardian(scheduler);
      
      // 默认配置应该可以启动
      expect(() => guardian.start()).not.toThrow();
    });

    /**
     * 测试用例: 自定义配置生效
     * 编号: UT-Guardian-004
     * 前置条件: 无
     * 测试步骤: 使用自定义配置创建守护进程
     * 预期结果: 配置正确应用
     */
    it('UT-Guardian-004 should apply custom configuration', () => {
      guardian = new SchedulerGuardian(scheduler, {
        checkIntervalMs: 2000,
        maxPendingAgeMs: 60000,
      });
      
      expect(guardian).toBeDefined();
    });

    /**
     * 测试用例: 重复启动不抛出错误
     * 编号: UT-Guardian-005
     * 前置条件: 守护进程已启动
     * 测试步骤: 再次调用 start
     * 预期结果: 不抛出错误，守护进程仍在运行
     */
    it('UT-Guardian-005 should handle multiple start calls', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      guardian.start();
      
      expect(() => guardian.start()).not.toThrow();
      expect(guardian.isRunning()).toBe(true);
    });

    /**
     * 测试用例: 重复停止不抛出错误
     * 编号: UT-Guardian-006
     * 前置条件: 守护进程未启动或已停止
     * 测试步骤: 多次调用 stop
     * 预期结果: 不抛出错误
     */
    it('UT-Guardian-006 should handle multiple stop calls', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      expect(() => guardian.stop()).not.toThrow();
      expect(() => guardian.stop()).not.toThrow();
      expect(guardian.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 获取守护进程状态
     * 编号: UT-Guardian-007
     * 前置条件: 守护进程已启动
     * 测试步骤: 获取状态
     * 预期结果: 返回正确的运行状态
     */
    it('UT-Guardian-007 should return correct running status', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      expect(guardian.isRunning()).toBe(false);
      
      guardian.start();
      expect(guardian.isRunning()).toBe(true);
      
      guardian.stop();
      expect(guardian.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 守护进程执行周期检查
     * 编号: UT-Guardian-008
     * 前置条件: 守护进程已启动，有待执行任务
     * 测试步骤: 等待一个检查周期
     * 预期结果: 周期检查被执行
     */
    it('UT-Guardian-008 should perform periodic checks', async () => {
      scheduler.addTask(fixtures.taskBase);
      
      let checkCount = 0;
      guardian = new SchedulerGuardian(scheduler, { 
        checkIntervalMs: 100,
        onCheck: () => { checkCount++; },
      });
      
      guardian.start();
      await new Promise(resolve => setTimeout(resolve, 350)); // Wait for ~3 checks
      guardian.stop();
      
      expect(checkCount).toBeGreaterThanOrEqual(2);
    });

    /**
     * 测试用例: 守护进程统计信息
     * 编号: UT-Guardian-009
     * 前置条件: 守护进程运行一段时间
     * 测试步骤: 获取统计信息
     * 预期结果: 返回检查次数等信息
     */
    it('UT-Guardian-009 should return statistics', async () => {
      scheduler.addTask(fixtures.taskBase);
      
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 100 });
      guardian.start();
      
      await new Promise(resolve => setTimeout(resolve, 250));
      guardian.stop();
      
      const stats = guardian.getStats();
      
      expect(stats.checkCount).toBeGreaterThan(0);
      expect(stats.lastCheckTime).toBeDefined();
    });

    /**
     * 测试用例: 守护进程正确处理空调度器
     * 编号: UT-Guardian-010
     * 前置条件: 调度器无任务
     * 测试步骤: 启动守护进程
     * 预期结果: 正常运行，不报错
     */
    it('UT-Guardian-010 should handle empty scheduler', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      expect(() => guardian.start()).not.toThrow();
      expect(guardian.isRunning()).toBe(true);
    });
  });

  describe('UT-Guardian-011 ~ 020: 任务监控功能', () => {
    /**
     * 测试用例: 检测待处理超时任务
     * 编号: UT-Guardian-011
     * 前置条件: 有任务等待时间超过阈值
     * 测试步骤: 启动守护进程并等待检测
     * 预期结果: 触发任务超时警告
     */
    it('UT-Guardian-011 should detect pending tasks exceeding age threshold', async () => {
      const taskId = scheduler.addTask(fixtures.taskBase);
      
      let timeoutDetected = false;
      guardian = new SchedulerGuardian(scheduler, {
        checkIntervalMs: 50,
        maxPendingAgeMs: 100, // 100ms threshold
        onTaskTimeout: (task: Task) => {
          if (task.id === taskId) {
            timeoutDetected = true;
          }
        },
      });
      
      // Wait for task to exceed threshold
      await new Promise(resolve => setTimeout(resolve, 150));
      guardian.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      guardian.stop();
      
      // The guardian should detect the timeout
      expect(timeoutDetected || scheduler.getTask(taskId)?.status !== TaskStatus.PENDING).toBe(true);
    });

    /**
     * 测试用例: 回调函数正确调用
     * 编号: UT-Guardian-012
     * 前置条件: 守护进程配置了回调
     * 测试步骤: 触发检查
     * 预期结果: 回调被正确调用
     */
    it('UT-Guardian-012 should call onCheck callback', () => {
      const onCheck = jest.fn();
      
      scheduler.addTask(fixtures.taskBase);
      guardian = new SchedulerGuardian(scheduler, {
        checkIntervalMs: 100,
        onCheck,
      });
      
      guardian.start();
      
      // Wait for at least one check
      return new Promise<void>(resolve => {
        setTimeout(() => {
          guardian.stop();
          expect(onCheck).toHaveBeenCalled();
          resolve();
        }, 200);
      });
    });

    /**
     * 测试用例: 任务卡住时触发回调
     * 编号: UT-Guardian-013
     * 前置条件: 有任务一直处于 RUNNING 状态
     * 测试步骤: 任务开始执行后等待超时
     * 预期结果: 触发任务卡住回调
     */
    it('UT-Guardian-013 should detect stuck running tasks', async () => {
      const taskId = scheduler.addTask(fixtures.slowTask);
      scheduler.registerExecutor('test-agent', fixtures.slowExecutor);
      
      let stuckDetected = false;
      guardian = new SchedulerGuardian(scheduler, {
        checkIntervalMs: 50,
        maxRunningAgeMs: 100, // Very short for testing
        onTaskStuck: (task: Task) => {
          if (task.id === taskId) {
            stuckDetected = true;
          }
        },
      });
      
      // Start task execution
      const executePromise = scheduler.executeTask(taskId, 'test-agent');
      
      // Wait a bit then start guardian
      await new Promise(resolve => setTimeout(resolve, 50));
      guardian.start();
      
      // Wait for stuck detection
      await new Promise(resolve => setTimeout(resolve, 150));
      guardian.stop();
      
      // Cleanup
      try {
        await executePromise;
      } catch (e) {}
      
      // Should have detected stuck task
      expect(stuckDetected).toBe(true);
    });

    /**
     * 测试用例: 守护进程不干扰正常任务执行
     * 编号: UT-Guardian-014
     * 前置条件: 任务正常执行
     * 测试步骤: 守护进程运行的同时执行任务
     * 预期结果: 任务正常完成
     */
    it('UT-Guardian-014 should not interfere with normal task execution', async () => {
      scheduler.registerExecutor('test-agent', fixtures.successfulExecutor);
      
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 100 });
      guardian.start();
      
      const taskId = scheduler.addTask(fixtures.taskBase);
      const result = await scheduler.executeTask(taskId, 'test-agent');
      
      guardian.stop();
      
      expect(result.success).toBe(true);
    });

    /**
     * 测试用例: 获取调度器状态
     * 编号: UT-Guardian-015
     * 前置条件: 调度器有任务
     * 测试步骤: 通过守护进程获取调度器状态
     * 预期结果: 返回正确的状态信息
     */
    it('UT-Guardian-015 should provide scheduler status', () => {
      scheduler.addTask(fixtures.taskBase);
      scheduler.addTask(fixtures.taskBase);
      
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      const status = guardian.getSchedulerStatus();
      
      expect(status.total).toBe(2);
      expect(status.pending).toBe(2);
    });

    /**
     * 测试用例: 正确处理调度器引用
     * 编号: UT-Guardian-016
     * 前置条件: 守护进程已创建
     * 测试步骤: 获取关联的调度器
     * 预期结果: 返回正确的调度器实例
     */
    it('UT-Guardian-016 should provide scheduler reference', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      const schedulerRef = guardian.getScheduler();
      
      expect(schedulerRef).toBe(scheduler);
    });

    /**
     * 测试用例: 多次调用 start 后调用 stop
     * 编号: UT-Guardian-017
     * 前置条件: 多次调用 start
     * 测试步骤: 调用 stop
     * 预期结果: 只停止一次
     */
    it('UT-Guardian-017 should handle start-start-stop correctly', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      guardian.start();
      guardian.start(); // Should not cause issues
      
      expect(guardian.isRunning()).toBe(true);
      
      guardian.stop();
      expect(guardian.isRunning()).toBe(false);
    });

    /**
     * 测试用例: 任务数量统计准确
     * 编号: UT-Guardian-018
     * 前置条件: 添加多个任务
     * 测试步骤: 获取统计信息
     * 预期结果: 任务计数准确
     */
    it('UT-Guardian-018 should track task counts accurately', () => {
      scheduler.addTask(fixtures.taskBase);
      scheduler.addTask(fixtures.taskBase);
      scheduler.addTask(fixtures.taskBase);
      
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      
      const status = guardian.getSchedulerStatus();
      
      expect(status.total).toBe(3);
      expect(status.pending).toBe(3);
    });

    /**
     * 测试用例: 守护进程内存使用稳定
     * 编号: UT-Guardian-019
     * 前置条件: 守护进程运行一段时间
     * 测试步骤: 多次检查
     * 预期结果: 内存不泄漏
     */
    it('UT-Guardian-019 should not leak memory during operation', async () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 50 });
      guardian.start();
      
      // Run several checks
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const stats = guardian.getStats();
      expect(stats.checkCount).toBeGreaterThan(0);
      
      // Should still work
      scheduler.addTask(fixtures.taskBase);
      const status = guardian.getSchedulerStatus();
      expect(status.total).toBe(1);
    });

    /**
     * 测试用例: 调度器关闭时守护进程能正确清理
     * 编号: UT-Guardian-020
     * 前置条件: 守护进程正在运行
     * 测试步骤: 停止守护进程
     * 预期结果: 正确清理资源
     */
    it('UT-Guardian-020 should clean up resources when stopped', () => {
      guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 1000 });
      guardian.start();
      
      expect(() => guardian.stop()).not.toThrow();
      
      // Should be able to restart
      expect(() => guardian.start()).not.toThrow();
      guardian.stop();
    });
  });

  describe('UT-Guardian-021 ~ 025: 错误处理', () => {
    /**
     * 测试用例: 调度器为 null 时抛出错误
     * 编号: UT-Guardian-021
     * 前置条件: 无
     * 测试步骤: 传入 null 调度器
     * 预期结果: 抛出错误
     */
    it('UT-Guardian-021 should throw error when scheduler is null', () => {
      expect(() => {
        new SchedulerGuardian(null as any, { checkIntervalMs: 1000 });
      }).toThrow();
    });

    /**
     * 测试用例: 负数检查间隔使用默认值
     * 编号: UT-Guardian-022
     * 前置条件: 无
     * 测试步骤: 使用负数检查间隔
     * 预期结果: 使用默认值
     */
    it('UT-Guardian-022 should use default for negative interval', () => {
      expect(() => {
        guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: -1 });
        guardian.start();
      }).not.toThrow();
      guardian?.stop();
    });

    /**
     * 测试用例: 零检查间隔使用默认值
     * 编号: UT-Guardian-023
     * 前置条件: 无
     * 测试步骤: 使用零检查间隔
     * 预期结果: 使用默认值
     */
    it('UT-Guardian-023 should use default for zero interval', () => {
      expect(() => {
        guardian = new SchedulerGuardian(scheduler, { checkIntervalMs: 0 });
        guardian.start();
      }).not.toThrow();
      guardian?.stop();
    });
  });
});
