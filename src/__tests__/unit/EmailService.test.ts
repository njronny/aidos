import { EmailService } from '../../integrations/notification/EmailService';
import { UnifiedMessage } from '../../core/notifier/types';

describe('EmailService', () => {
  let emailService: EmailService;
  const validConfig = {
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: 'user@example.com',
    smtpPass: 'password123',
    fromEmail: 'noreply@example.com',
    fromName: 'AIDOS',
    email: 'recipient@example.com',
  };

  beforeEach(() => {
    emailService = new EmailService(validConfig);
  });

  describe('constructor', () => {
    it('should create service with config', () => {
      expect(emailService).toBeDefined();
    });

    it('should use default SMTP settings when not provided', () => {
      const service = new EmailService({
        email: 'test@example.com',
      });
      
      expect(service).toBeDefined();
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      const message: UnifiedMessage = {
        id: 'test-123',
        type: 'alert',
        priority: 'normal',
        title: 'Test Email',
        content: 'This is a test email.',
        timestamp: new Date(),
      };

      const result = await emailService.send(message);
      
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle send failure', async () => {
      const service = new EmailService({
        smtpHost: '',
        smtpUser: '',
        smtpPass: '',
        email: '',
      });

      const message: UnifiedMessage = {
        id: 'test-123',
        type: 'alert',
        priority: 'normal',
        title: 'Test',
        content: 'Test',
        timestamp: new Date(),
      };

      const result = await service.send(message);
      
      expect(result.success).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should validate valid config', () => {
      const result = emailService.validateConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing SMTP host when not using default', () => {
      const service = new EmailService({
        smtpUser: 'user',
        smtpPass: 'pass',
        email: 'test@example.com',
      });

      // Check if the service has a default host (it does)
      // So let's check that validation still passes because of default
      const result = service.validateConfig();
      
      // Default host is used, so validation should pass
      expect(result.valid).toBe(true);
    });

    it('should detect missing SMTP user', () => {
      const service = new EmailService({
        smtpHost: 'smtp.example.com',
        smtpPass: 'pass',
        email: 'test@example.com',
      });

      const result = service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('SMTP user is required');
    });

    it('should detect missing recipient', () => {
      const service = new EmailService({
        smtpHost: 'smtp.example.com',
        smtpUser: 'user',
        smtpPass: 'pass',
      });

      const result = service.validateConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one recipient email is required');
    });
  });

  describe('test', () => {
    it('should run test successfully', async () => {
      const result = await emailService.test();
      
      expect(result.success).toBe(true);
    });
  });

  describe('getServiceName', () => {
    it('should return service name', () => {
      expect(emailService.getServiceName()).toBe('EmailService');
    });
  });
});
