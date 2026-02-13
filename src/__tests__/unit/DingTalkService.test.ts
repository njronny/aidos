import { DingTalkService } from '../../integrations/notification/DingTalkService';
import { UnifiedMessage } from '../../core/notifier/types';
import { MessageFormatter } from '../../integrations/notification/MessageFormatter';

describe('DingTalkService', () => {
  let dingTalkService: DingTalkService;
  const validConfig = {
    dingtalkWebhook: 'https://oapi.dingtalk.com/robot/send?access_token=test123',
    dingtalkSecret: 'SECxxxxxxxx',
  };

  beforeEach(() => {
    dingTalkService = new DingTalkService(validConfig);
  });

  describe('constructor', () => {
    it('should create service with valid config', () => {
      expect(dingTalkService).toBeDefined();
    });

    it('should throw error when webhook is missing', () => {
      expect(() => {
        new DingTalkService({});
      }).toThrow('DingTalk webhook URL is required');
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      const message: UnifiedMessage = {
        id: 'test-123',
        type: 'alert',
        priority: 'normal',
        title: 'Test Notification',
        content: 'This is a test message.',
        timestamp: new Date(),
      };

      const result = await dingTalkService.send(message);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should send with different priorities', async () => {
      const urgentMessage: UnifiedMessage = {
        id: 'test-urgent',
        type: 'error',
        priority: 'urgent',
        title: 'Urgent Alert',
        content: 'Critical issue detected!',
        timestamp: new Date(),
      };

      const result = await dingTalkService.send(urgentMessage);
      
      expect(result.success).toBe(true);
    });
  });

  describe('sendText', () => {
    it('should send plain text message', async () => {
      const result = await dingTalkService.sendText('Hello from AIDOS!');
      
      expect(result.success).toBe(true);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const result = dingTalkService.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing webhook', () => {
      // Constructor throws when webhook is missing, so test validation directly
      const service = Object.create(DingTalkService.prototype);
      service.webhookUrl = '';
      service.secret = '';
      service.formatter = new MessageFormatter();
      
      const result = service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DingTalk webhook URL is required');
    });

    it('should detect non-HTTPS webhook', () => {
      const service = new DingTalkService({
        dingtalkWebhook: 'http://oapi.dingtalk.com/robot/send?access_token=test',
      });

      const result = service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DingTalk webhook URL must use HTTPS');
    });
  });

  describe('test', () => {
    it('should run test successfully', async () => {
      const result = await dingTalkService.test();
      
      expect(result.success).toBe(true);
    });
  });

  describe('getServiceName', () => {
    it('should return service name', () => {
      expect(dingTalkService.getServiceName()).toBe('DingTalkService');
    });
  });
});
