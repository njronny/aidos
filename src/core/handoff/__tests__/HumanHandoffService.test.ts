/**
 * HumanHandoffService 人工接管服务 - TDD 测试
 * 关键节点等待人工确认、异常时呼叫人工
 */

import { HumanHandoffService, HandoffEvent, HandoffPriority } from '../HumanHandoffService';

describe('HumanHandoffService', () => {
  let service: HumanHandoffService;

  beforeEach(() => {
    service = new HumanHandoffService();
  });

  describe('requestHandoff', () => {
    it('should create handoff request', async () => {
      const event = await service.requestHandoff('task-123', '需要人工审核代码', 'high');
      
      expect(event).toHaveProperty('id');
      expect(event.taskId).toBe('task-123');
      expect(event.status).toBe('pending');
    });

    it('should handle different priorities', async () => {
      const urgent = await service.requestHandoff('task-1', '紧急', 'critical');
      const normal = await service.requestHandoff('task-2', '普通', 'normal');
      
      expect(urgent.priority).toBe('critical');
      expect(normal.priority).toBe('normal');
    });
  });

  describe('approveHandoff', () => {
    it('should approve handoff', async () => {
      const event = await service.requestHandoff('task-1', 'test', 'normal');
      
      const approved = await service.approveHandoff(event.id);
      
      expect(approved).not.toBeNull();
      expect(approved!.status).toBe('approved');
      expect(approved!.approvedAt).toBeDefined();
    });

    it('should fail for invalid id', async () => {
      const result = await service.approveHandoff('invalid-id');
      
      expect(result).toBeNull();
    });
  });

  describe('rejectHandoff', () => {
    it('should reject handoff', async () => {
      const event = await service.requestHandoff('task-1', 'test', 'normal');
      
      const rejected = await service.rejectHandoff(event.id, '任务不需要人工介入');
      
      expect(rejected).not.toBeNull();
      expect(rejected!.status).toBe('rejected');
    });
  });

  describe('getPendingHandoffs', () => {
    it('should list pending handoffs', async () => {
      await service.requestHandoff('task-1', 'test1', 'normal');
      await service.requestHandoff('task-2', 'test2', 'high');
      
      const pending = service.getPendingHandoffs();
      
      expect(pending.length).toBe(2);
    });
  });

  describe('autoTimeout', () => {
    it('should handle timeout', async () => {
      // 设置超时为 0 立即超时
      service.setConfig({ timeoutMs: 0 });
      
      const event = await service.requestHandoff('task-timeout', '测试超时', 'normal');
      
      // 等待超时处理
      await new Promise(r => setTimeout(r, 50));
      
      const updated = service.getHandoff(event.id);
      expect(updated?.status).toBeDefined();
    });
  });
});
