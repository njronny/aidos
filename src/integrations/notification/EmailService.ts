import { UnifiedMessage, EmailPayload, ChannelConfig } from '../../core/notifier/types';
import { MessageFormatter } from './MessageFormatter';

/**
 * Email Service - Send notifications via email
 * Supports SMTP configuration
 */
export class EmailService {
  private config: ChannelConfig;
  private formatter: MessageFormatter;

  constructor(config: ChannelConfig) {
    this.config = {
      smtpHost: config.smtpHost || 'smtp.gmail.com',
      smtpPort: config.smtpPort || 587,
      smtpUser: config.smtpUser,
      smtpPass: config.smtpPass,
      fromEmail: config.fromEmail || config.smtpUser,
      fromName: config.fromName || 'AIDOS Notifications',
      email: config.email,
    };
    this.formatter = new MessageFormatter();
  }

  /**
   * Send email notification
   */
  async send(message: UnifiedMessage): Promise<{ success: boolean; error?: string }> {
    const recipients = this.getRecipients();
    
    if (recipients.length === 0) {
      return { success: false, error: 'No recipients configured' };
    }

    const payload = this.formatter.formatForEmail(message);
    payload.to = recipients;
    payload.from = this.config.fromEmail;
    payload.fromName = this.config.fromName;

    try {
      // In production, use nodemailer or similar
      // For now, log the email that would be sent
      await this.sendViaSMTP(payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get configured recipients
   */
  private getRecipients(): string[] {
    if (this.config.email) {
      return Array.isArray(this.config.email) 
        ? this.config.email 
        : [this.config.email];
    }
    return [];
  }

  /**
   * Send email via SMTP
   * This is a placeholder - in production, use nodemailer
   */
  private async sendViaSMTP(payload: EmailPayload): Promise<void> {
    const { to, subject, html, text, from, fromName } = payload;
    
    // Log the email details (placeholder for actual SMTP sending)
    console.log('=== Email Notification ===');
    console.log(`From: ${fromName || from}`);
    console.log(`To: ${Array.isArray(to) ? to.join(', ') : to}`);
    console.log(`Subject: ${subject}`);
    console.log(`SMTP Host: ${this.config.smtpHost}:${this.config.smtpPort}`);
    console.log('--------------------------');
    
    // In production, uncomment below with nodemailer:
    // const transporter = nodemailer.createTransport({
    //   host: this.config.smtpHost,
    //   port: this.config.smtpPort,
    //   secure: this.config.smtpPort === 465,
    //   auth: {
    //     user: this.config.smtpUser,
    //     pass: this.config.smtpPass,
    //   },
    // });
    // 
    // await transporter.sendMail({
    //   from: `${fromName} <${from}>`,
    //   to: Array.isArray(to) ? to.join(', ') : to,
    //   subject,
    //   html,
    //   text,
    // });
    
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Test email configuration
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    const testMessage: UnifiedMessage = {
      id: 'test',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS Email Test',
      content: 'This is a test email from AIDOS notification system.',
      timestamp: new Date(),
    };

    return this.send(testMessage);
  }

  /**
   * Validate email configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.config.smtpHost) {
      errors.push('SMTP host is required');
    }

    if (!this.config.smtpUser) {
      errors.push('SMTP user is required');
    }

    if (!this.config.smtpPass) {
      errors.push('SMTP password is required');
    }

    if (!this.config.email) {
      errors.push('At least one recipient email is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get service name
   */
  getServiceName(): string {
    return 'EmailService';
  }
}

export default EmailService;
