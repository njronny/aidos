/**
 * FeedbackService 反馈服务 - TDD 测试
 * 用户反馈收集、失败案例学习、Prompt 优化
 */

import { FeedbackService, Feedback, FeedbackCategory, PromptLearning } from '../FeedbackService';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    service = new FeedbackService();
  });

  describe('submitFeedback', () => {
    it('should reject empty feedback', async () => {
      await expect(service.submitFeedback('')).rejects.toThrow('反馈内容不能为空');
    });

    it('should accept valid feedback', async () => {
      const feedback = await service.submitFeedback('代码生成质量很好');
      
      expect(feedback).toHaveProperty('id');
      expect(feedback.content).toBe('代码生成质量很好');
      expect(feedback.status).toBe('pending');
    });

    it('should categorize feedback', async () => {
      const feedback = await service.submitFeedback('登录页面有问题', 'ui');
      
      expect(feedback.category).toBe('ui');
    });
  });

  describe('recordFailure', () => {
    it('should record task failure', async () => {
      const failure = await service.recordFailure(
        'task-123',
        '代码编译失败',
        { error: 'Syntax error' }
      );
      
      expect(failure).toHaveProperty('taskId');
      expect(failure.error).toBe('代码编译失败');
      expect(failure.status).toBe('open');
    });

    it('should analyze failure patterns', async () => {
      // 记录多个失败
      await service.recordFailure('task-1', 'Syntax error in line 10', { type: 'syntax' });
      await service.recordFailure('task-2', 'Another syntax error', { type: 'syntax' });
      await service.recordFailure('task-3', 'Test failed: expected to equal', { type: 'test' });
      
      const patterns = await service.analyzeFailurePatterns();
      
      expect(patterns).toHaveProperty('total');
      expect(patterns.total).toBe(3);
      expect(patterns.recommendations).toBeDefined();
    });
  });

  describe('learnFromFeedback', () => {
    it('should generate prompt improvements', async () => {
      await service.submitFeedback('生成的代码缺少注释');
      await service.submitFeedback('代码风格不统一');
      
      const learnings = await service.learnFromFeedback();
      
      expect(learnings).toHaveProperty('improvements');
      expect(Array.isArray(learnings.improvements)).toBe(true);
    });
  });

  describe('getFeedbackStats', () => {
    it('should return feedback statistics', async () => {
      await service.submitFeedback('反馈1');
      await service.submitFeedback('反馈2');
      
      const stats = await service.getFeedbackStats();
      
      expect(stats.total).toBe(2);
      expect(stats).toHaveProperty('byCategory');
    });
  });

  describe('resolveFeedback', () => {
    it('should resolve feedback', async () => {
      const feedback = await service.submitFeedback('测试反馈');
      
      const resolved = await service.resolveFeedback(feedback.id);
      
      expect(resolved).not.toBeNull();
      expect(resolved!.status).toBe('resolved');
      expect(resolved!.resolvedAt).toBeDefined();
    });
  });
});
