import { MessageFormatter } from '../../integrations/notification/MessageFormatter';
import { UnifiedMessage, NotificationPriority } from '../../core/notifier/types';

describe('MessageFormatter', () => {
  let formatter: MessageFormatter;

  beforeEach(() => {
    formatter = new MessageFormatter();
  });

  const createTestMessage = (priority: NotificationPriority = 'normal'): UnifiedMessage => ({
    id: 'test-123',
    type: 'milestone',
    priority,
    title: 'Test Notification',
    content: 'This is a test message content.\nWith multiple lines.',
    timestamp: new Date('2024-01-01T12:00:00Z'),
    metadata: {
      projectName: 'AIDOS',
      taskId: 'task-456',
    },
  });

  describe('formatForEmail', () => {
    it('should format message for email correctly', () => {
      const message = createTestMessage();
      const result = formatter.formatForEmail(message);

      expect(result.subject).toContain('Test Notification');
      expect(result.html).toContain('Test Notification');
      expect(result.html).toContain('This is a test message content');
      expect(result.text).toContain('Test Notification');
    });

    it('should include priority in subject', () => {
      const message = createTestMessage('urgent');
      const result = formatter.formatForEmail(message);

      expect(result.subject).toContain('URGENT');
    });

    it('should escape HTML characters', () => {
      const message: UnifiedMessage = {
        ...createTestMessage(),
        content: '<script>alert("xss")</script>',
      };
      const result = formatter.formatForEmail(message);

      expect(result.html).toContain('&lt;script&gt;');
      expect(result.html).not.toContain('<script>');
    });
  });

  describe('formatForDingTalk', () => {
    it('should format message for DingTalk correctly', () => {
      const message = createTestMessage();
      const result = formatter.formatForDingTalk(message);

      expect(result.msgtype).toBe('markdown');
      expect(result.markdown.title).toBe('Test Notification');
      expect(result.markdown.text).toContain('Test Notification');
      expect(result.markdown.text).toContain('milestone');
    });

    it('should include priority emoji', () => {
      const urgentMessage = createTestMessage('urgent');
      const result = formatter.formatForDingTalk(urgentMessage);

      expect(result.markdown.text).toContain('🔴');
    });
  });

  describe('formatForSlack', () => {
    it('should format message for Slack correctly', () => {
      const message = createTestMessage();
      const result = formatter.formatForSlack(message);

      expect(result.text).toContain('Test Notification');
      expect(result.blocks).toBeDefined();
      expect(result.blocks!.length).toBeGreaterThan(0);
      expect(result.attachments).toBeDefined();
    });

    it('should include header block', () => {
      const message = createTestMessage();
      const result = formatter.formatForSlack(message);

      const headerBlock = result.blocks!.find(b => b.type === 'header');
      expect(headerBlock).toBeDefined();
      expect(headerBlock!.text!.text).toContain('Test Notification');
    });

    it('should include priority color in attachment', () => {
      const urgentMessage = createTestMessage('urgent');
      const result = formatter.formatForSlack(urgentMessage);

      expect(result.attachments![0].color).toBe('#dc3545');
    });
  });
});
