/**
 * CheckpointService 单元测试
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import { CheckpointService } from '../CheckpointService';

// 测试用的临时目录
const TEST_DIR = path.join(__dirname, 'test-data-checkpoints');

describe('CheckpointService', () => {
  let service: CheckpointService;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    service = new CheckpointService({
      checkpointDir: TEST_DIR,
      checkpointInterval: 1000,
      maxCheckpointsPerTask: 3,
    });
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
    try {
      await fs.rm(TEST_DIR, { recursive: true, force: true });
    } catch (e) {}
  });

  describe('createCheckpoint', () => {
    it('should create a checkpoint', async () => {
      const checkpoint = await service.createCheckpoint(
        'task-1',
        0,
        'step-initialization',
        { data: 'test' }
      );

      expect(checkpoint.taskId).toBe('task-1');
      expect(checkpoint.stepIndex).toBe(0);
      expect(checkpoint.stepName).toBe('step-initialization');
      expect(checkpoint.state).toEqual({ data: 'test' });
    });

    it('should be idempotent - same state should not create duplicate', async () => {
      const state = { data: 'test', count: 1 };
      
      const cp1 = await service.createCheckpoint('task-1', 0, 'step1', state);
      const cp2 = await service.createCheckpoint('task-1', 0, 'step1', state);

      // 应该返回相同的checkpointId
      expect(cp1.checkpointId).toBe(cp2.checkpointId);
    });

    it('should update checkpoint when state changes', async () => {
      const cp1 = await service.createCheckpoint('task-1', 0, 'step1', { data: 'v1' });
      const cp2 = await service.createCheckpoint('task-1', 0, 'step1', { data: 'v2' });

      expect(cp1.checkpointId).toBe(cp2.checkpointId);
      expect(cp2.state.data).toBe('v2');
    });
  });

  describe('getCheckpoints', () => {
    it('should get all checkpoints for a task', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { step: 1 });
      await service.createCheckpoint('task-1', 1, 'step2', { step: 2 });
      await service.createCheckpoint('task-1', 2, 'step3', { step: 3 });

      const checkpoints = await service.getCheckpoints('task-1');

      expect(checkpoints).toHaveLength(3);
      expect(checkpoints.map(c => c.stepIndex)).toEqual([0, 1, 2]);
    });

    it('should return empty array for non-existent task', async () => {
      const checkpoints = await service.getCheckpoints('non-existent');

      expect(checkpoints).toHaveLength(0);
    });
  });

  describe('getLatestCheckpoint', () => {
    it('should return the latest checkpoint', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { v: 1 });
      await service.createCheckpoint('task-1', 1, 'step2', { v: 2 });
      await service.createCheckpoint('task-1', 2, 'step3', { v: 3 });

      const latest = await service.getLatestCheckpoint('task-1');

      expect(latest?.stepIndex).toBe(2);
      expect(latest?.state.v).toBe(3);
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('should restore from latest checkpoint', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { data: 'initial' });
      await service.createCheckpoint('task-1', 1, 'step2', { data: 'processed', count: 5 });

      const result = await service.restoreFromCheckpoint('task-1');

      expect(result).not.toBeNull();
      expect(result?.state.data).toBe('processed');
      expect(result?.state.count).toBe(5);
    });

    it('should restore from specific checkpoint', async () => {
      const cp1 = await service.createCheckpoint('task-1', 0, 'step1', { step: 1 });
      await service.createCheckpoint('task-1', 1, 'step2', { step: 2 });

      const result = await service.restoreFromCheckpoint('task-1', cp1.checkpointId);

      expect(result?.state.step).toBe(1);
    });

    it('should return null for non-existent checkpoint', async () => {
      const result = await service.restoreFromCheckpoint('task-1', 'non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('updateState', () => {
    it('should update task state incrementally', async () => {
      // 创建禁用增量检查点的服务
      const noIncService = new CheckpointService({
        checkpointDir: TEST_DIR,
        enableIncrementalCheckpoint: false,
      });
      await noIncService.initialize();

      // 先创建检查点，然后恢复状态（这样stepState才会有数据）
      await noIncService.createCheckpoint('task-1', 0, 'step1', { a: 1 });
      await noIncService.restoreFromCheckpoint('task-1');

      // 现在更新状态
      await noIncService.updateState('task-1', { b: 2 });
      const state = noIncService.getState('task-1');

      expect(state).toEqual({ a: 1, b: 2 });

      await noIncService.close();
    });
  });

  describe('checkpoint pruning', () => {
    it('should prune old checkpoints when exceeding max', async () => {
      // 创建超过maxCheckpointsPerTask的检查点
      for (let i = 0; i < 5; i++) {
        await service.createCheckpoint('task-1', i, `step${i}`, { index: i });
      }

      const checkpoints = await service.getCheckpoints('task-1');

      // 应该保留最新的3个
      expect(checkpoints).toHaveLength(3);
      expect(checkpoints.map(c => c.stepIndex)).toEqual([2, 3, 4]);
    });
  });

  describe('deleteCheckpoints', () => {
    it('should delete all checkpoints for a task', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { data: 1 });
      await service.createCheckpoint('task-1', 1, 'step2', { data: 2 });

      await service.deleteCheckpoints('task-1');
      const checkpoints = await service.getCheckpoints('task-1');

      expect(checkpoints).toHaveLength(0);
    });
  });

  describe('getCheckpointMetadata', () => {
    it('should return metadata for checkpoints', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { v: 1 });
      await service.createCheckpoint('task-1', 1, 'step2', { v: 2 });

      const metadata = await service.getCheckpointMetadata('task-1');

      expect(metadata).not.toBeNull();
      expect(metadata?.taskId).toBe('task-1');
      expect(metadata?.totalSteps).toBe(2);
      expect(metadata?.currentStep).toBe(1);
    });

    it('should return null for task without checkpoints', async () => {
      const metadata = await service.getCheckpointMetadata('non-existent');

      expect(metadata).toBeNull();
    });
  });

  describe('persistence', () => {
    it('should persist checkpoints to disk', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', { data: 'persisted' });

      // 关闭并重新创建服务
      await service.close();
      const newService = new CheckpointService({ checkpointDir: TEST_DIR });
      await newService.initialize();

      const checkpoint = await newService.getLatestCheckpoint('task-1');

      expect(checkpoint).not.toBeNull();
      expect(checkpoint?.state.data).toBe('persisted');

      await newService.close();
    });
  });

  describe('periodic checkpoint', () => {
    it('should start and stop periodic checkpoint', async () => {
      let stepIndex = 0;
      const getState = () => ({ count: stepIndex });
      const getStep = () => {
        const idx = stepIndex++;
        return { index: idx, name: `step${idx}` };
      };

      service.startPeriodicCheckpoint('task-1', getState, getStep);

      // 等待至少一个检查点周期
      await new Promise(r => setTimeout(r, 1500));

      const checkpoints = await service.getCheckpoints('task-1');
      expect(checkpoints.length).toBeGreaterThan(0);

      service.stopPeriodicCheckpoint('task-1');
    });
  });

  describe('getStatus', () => {
    it('should return correct status', async () => {
      await service.createCheckpoint('task-1', 0, 'step1', {});

      const status = service.getStatus();

      expect(status.activeCheckpoints).toBe(1);
      expect(status.isInitialized).toBe(true);
    });
  });
});
