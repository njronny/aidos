/**
 * TaskStateManager 单元测试
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { TaskStateManager } from '../TaskStateManager';
import { TaskStatus } from '../../../types';

// 测试用的临时目录
const TEST_DIR = path.join(__dirname, 'test-data-task-state');

describe('TaskStateManager', () => {
  let manager: TaskStateManager;

  beforeEach(async () => {
    // 创建测试目录
    await fs.mkdir(TEST_DIR, { recursive: true });
    manager = new TaskStateManager({
      storagePath: TEST_DIR,
      autoSaveInterval: 1000,
    });
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.close();
    // 清理测试目录
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (e) {}
  });

  describe('createTaskState', () => {
    it('should create a new task state', async () => {
      const snapshot = await manager.createTaskState('task-1', 'Test Task');

      expect(snapshot.taskId).toBe('task-1');
      expect(snapshot.taskName).toBe('Test Task');
      expect(snapshot.status).toBe(TaskStatus.PENDING);
      expect(snapshot.progress).toBe(0);
      expect(snapshot.completedSteps).toEqual([]);
    });

    it('should create task state with metadata', async () => {
      const metadata = { projectId: 'proj-1', priority: 2 };
      const snapshot = await manager.createTaskState('task-2', 'Task With Meta', metadata);

      expect(snapshot.metadata).toEqual(metadata);
    });
  });

  describe('updateTaskState', () => {
    it('should update task status', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      const updated = await manager.updateTaskState('task-1', {
        status: TaskStatus.RUNNING,
        startedAt: new Date(),
      });

      expect(updated?.status).toBe(TaskStatus.RUNNING);
    });

    it('should track completed steps', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.updateCurrentStep('task-1', 'step-1');
      const state = manager.getTaskState('task-1');

      expect(state?.completedSteps).toContain('step-1');
    });

    it('should be idempotent - same update should not duplicate', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      const first = await manager.updateTaskState('task-1', { status: TaskStatus.RUNNING });
      
      // 等待一小段时间确保updatedAt会不同
      await new Promise(r => setTimeout(r, 10));
      
      const second = await manager.updateTaskState('task-1', { status: TaskStatus.RUNNING });

      // 幂等性：相同的状态更新不会改变结果数据（progress等），只是时间戳更新
      // 这里验证更新后状态的关键字段（除updatedAt外）保持一致
      expect(second?.status).toBe(first?.status);
      expect(second?.progress).toBe(first?.progress);
    });
  });

  describe('markRunning, markCompleted, markFailed', () => {
    it('should mark task as running', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.markRunning('task-1');
      const state = manager.getTaskState('task-1');

      expect(state?.status).toBe(TaskStatus.RUNNING);
      expect(state?.startedAt).toBeDefined();
    });

    it('should mark task as completed', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.markCompleted('task-1', { success: true, output: 'Done' });
      const state = manager.getTaskState('task-1');

      expect(state?.status).toBe(TaskStatus.COMPLETED);
      expect(state?.progress).toBe(100);
      expect(state?.result?.success).toBe(true);
    });

    it('should mark task as failed', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.markFailed('task-1', 'Something went wrong');
      const state = manager.getTaskState('task-1');

      expect(state?.status).toBe(TaskStatus.FAILED);
      expect(state?.error).toBe('Something went wrong');
    });
  });

  describe('getRunningTasks', () => {
    it('should return only running tasks', async () => {
      await manager.createTaskState('task-1', 'Task 1');
      await manager.createTaskState('task-2', 'Task 2');
      await manager.markRunning('task-1');
      await manager.markCompleted('task-2');

      const running = manager.getRunningTasks();

      expect(running).toHaveLength(1);
      expect(running[0].taskId).toBe('task-1');
    });
  });

  describe('getRecoverableTasks', () => {
    it('should return tasks that can be recovered', async () => {
      await manager.createTaskState('task-1', 'Task 1');
      await manager.createTaskState('task-2', 'Task 2');
      await manager.createTaskState('task-3', 'Task 3');
      await manager.markRunning('task-1');
      await manager.markCompleted('task-2');

      const recoverable = manager.getRecoverableTasks();

      expect(recoverable).toHaveLength(2);
      expect(recoverable.map(t => t.taskId)).toContain('task-1');
      expect(recoverable.map(t => t.taskId)).toContain('task-3');
    });
  });

  describe('recoverTaskState', () => {
    it('should recover a running task to pending state', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      await manager.markRunning('task-1');
      await manager.updateProgress('task-1', 50);

      const recovered = await manager.recoverTaskState('task-1');

      expect(recovered?.status).toBe(TaskStatus.PENDING);
      expect(recovered?.progress).toBe(50);
    });

    it('should not recover completed or failed tasks', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      await manager.markCompleted('task-1');

      const recovered = await manager.recoverTaskState('task-1');

      expect(recovered?.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('deleteTaskState', () => {
    it('should delete task state', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.deleteTaskState('task-1');
      const state = manager.getTaskState('task-1');

      expect(state).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('should persist task state to disk', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      await manager.markRunning('task-1');
      await manager.updateProgress('task-1', 30);

      // 关闭并重新创建管理器
      await manager.close();
      const newManager = new TaskStateManager({ storagePath: TEST_DIR });
      await newManager.initialize();

      const state = newManager.getTaskState('task-1');

      expect(state).toBeDefined();
      expect(state?.status).toBe(TaskStatus.RUNNING);
      expect(state?.progress).toBe(30);

      await newManager.close();
    });
  });

  describe('progress tracking', () => {
    it('should update progress correctly', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.updateProgress('task-1', 50);
      expect(manager.getTaskProgress('task-1')).toBe(50);

      await manager.updateProgress('task-1', 75);
      expect(manager.getTaskProgress('task-1')).toBe(75);
    });

    it('should clamp progress between 0 and 100', async () => {
      await manager.createTaskState('task-1', 'Test Task');
      
      await manager.updateProgress('task-1', 150);
      expect(manager.getTaskProgress('task-1')).toBe(100);

      await manager.updateProgress('task-1', -10);
      expect(manager.getTaskProgress('task-1')).toBe(0);
    });
  });
});
