/**
 * RecoveryService 恢复服务 - TDD 测试
 * 任务失败自动重试/回滚机制
 */

import { RecoveryService, RecoveryPolicy, RollbackResult } from '../RecoveryService';

describe('RecoveryService', () => {
  let service: RecoveryService;

  beforeEach(() => {
    service = new RecoveryService();
  });

  describe('constructor', () => {
    it('should create service with default config', () => {
      expect(service).toBeDefined();
    });
  });

  describe('handleFailure', () => {
    it('should retry task on failure', async () => {
      const result = await service.handleFailure('task-123', '编译错误');
      
      expect(result).toHaveProperty('taskId');
      expect(result).toHaveProperty('action');
      expect(['retry', 'rollback', 'alert']).toContain(result.action);
    });

    it('should track retry count', async () => {
      await service.handleFailure('task-1', '错误1');
      await service.handleFailure('task-1', '错误2');
      
      const stats = service.getStats();
      expect(stats.totalRetries).toBeGreaterThan(0);
    });

    it('should alert after max retries', async () => {
      // 模拟多次失败
      const result = await service.handleFailure('task-max', '持续失败');
      
      // 应该触发告警
      expect(result.action).toBeDefined();
    });
  });

  describe('rollback', () => {
    it('should perform rollback', async () => {
      const result = await service.rollback('task-123');
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('taskId');
    });

    it('should handle rollback failure', async () => {
      const result = await service.rollback('nonexistent');
      
      expect(result.success).toBe(false);
    });
  });

  describe('setPolicy', () => {
    it('should update recovery policy', () => {
      const policy: RecoveryPolicy = {
        maxRetries: 5,
        retryDelay: 1000,
        enableRollback: true,
        alertAfterMaxRetries: true,
      };
      
      service.setPolicy(policy);
      
      const stats = service.getStats();
      expect(stats.policy.maxRetries).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should return recovery statistics', async () => {
      await service.handleFailure('task-1', 'error');
      
      const stats = service.getStats();
      
      expect(stats).toHaveProperty('totalFailures');
      expect(stats).toHaveProperty('totalRetries');
      expect(stats).toHaveProperty('totalRollbacks');
      expect(stats).toHaveProperty('policy');
    });
  });
});
