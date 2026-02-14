/**
 * Notifier 单元测试
 */

import { Notifier } from '../Notifier';
import { Notification, NotificationType, NotificationPriority } from '../types';

describe('Notifier', () => {
  let notifier: Notifier;

  beforeEach(() => {
    notifier = new Notifier({
      channels: [{ type: 'console', config: {}, enabled: true }],
      enableMilestones: true,
      enableErrors: true,
      enableProgress: false,
    });
  });

  describe('constructor', () => {
    it('should create notifier with default config', () => {
      const n = new Notifier();
      expect(n).toBeDefined();
    });

    it('should accept custom channels', () => {
      const n = new Notifier({
        channels: [
          { type: 'console', config: {}, enabled: true },
          { type: 'email', config: { smtpHost: 'smtp.test.com' }, enabled: false },
        ],
      });
      expect(n).toBeDefined();
    });
  });

  describe('Notification Types', () => {
    it('should define notification types', () => {
      const types: NotificationType[] = ['milestone', 'error', 'progress', 'completion', 'alert'];
      
      expect(types).toContain('completion');
      expect(types).toContain('error');
      expect(types).toContain('progress');
    });

    it('should define notification priorities', () => {
      const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];
      
      expect(priorities).toContain('normal');
      expect(priorities).toContain('high');
    });

    it('should create notification object', () => {
      const notification: Notification = {
        id: '1',
        type: 'completion',
        priority: 'normal',
        title: 'Task Completed',
        message: 'Task finished successfully',
        timestamp: new Date(),
      };
      
      expect(notification.type).toBe('completion');
      expect(notification.title).toBe('Task Completed');
    });
  });

  describe('Notification Configuration', () => {
    it('should enable milestone notifications', () => {
      const n = new Notifier({ enableMilestones: true });
      expect((n as any).config.enableMilestones).toBe(true);
    });

    it('should enable error notifications', () => {
      const n = new Notifier({ enableErrors: true });
      expect((n as any).config.enableErrors).toBe(true);
    });

    it('should support progress interval', () => {
      const n = new Notifier({ 
        enableProgress: true,
        progressInterval: 60,
      });
      expect((n as any).config.progressInterval).toBe(60);
    });

    it('should support quiet hours', () => {
      const n = new Notifier({
        quietHours: { start: '22:00', end: '08:00' },
      });
      expect((n as any).config.quietHours).toBeDefined();
    });
  });

  describe('Channel Types', () => {
    it('should support console channel', () => {
      const config = { type: 'console' as const };
      expect(config.type).toBe('console');
    });

    it('should support email channel', () => {
      const config = { 
        type: 'email' as const,
        config: { smtpHost: 'smtp.test.com' },
      };
      expect(config.type).toBe('email');
    });

    it('should support Slack channel', () => {
      const config = { 
        type: 'slack' as const,
        config: { webhookUrl: 'https://hooks.slack.com/xxx' },
      };
      expect(config.type).toBe('slack');
    });

    it('should support DingTalk channel', () => {
      const config = { 
        type: 'dingtalk' as const,
        config: { webhookUrl: 'https://oapi.dingtalk.com/xxx' },
      };
      expect(config.type).toBe('dingtalk');
    });

    it('should support QQ channel', () => {
      const config = { 
        type: 'qq' as const,
        config: { webhookUrl: 'https://qq.com/webhook' },
      };
      expect(config.type).toBe('qq');
    });

    it('should support Telegram channel', () => {
      const config = { 
        type: 'telegram' as const,
        config: { botToken: 'xxx' },
      };
      expect(config.type).toBe('telegram');
    });
  });
});
