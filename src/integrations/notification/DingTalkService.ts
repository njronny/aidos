import { UnifiedMessage, DingTalkPayload, ChannelConfig } from '../../core/notifier/types';
import { MessageFormatter } from './MessageFormatter';

/**
 * DingTalk Service - Send notifications to DingTalk
 * Supports custom robots with webhook and secret
 */
export class DingTalkService {
  private webhookUrl: string;
  private secret: string;
  private formatter: MessageFormatter;

  constructor(config: ChannelConfig) {
    if (!config.dingtalkWebhook) {
      throw new Error('DingTalk webhook URL is required');
    }

    this.webhookUrl = config.dingtalkWebhook;
    this.secret = config.dingtalkSecret || '';
    this.formatter = new MessageFormatter();
  }

  /**
   * Send notification to DingTalk
   */
  async send(message: UnifiedMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = this.formatter.formatForDingTalk(message);
      
      // Add timestamp and sign for security if secret is configured
      const urlWithAuth = this.getSignedUrl();
      
      // In production, use fetch to POST to DingTalk API
      await this.postToDingTalk(urlWithAuth, payload);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Get webhook URL with timestamp and signature
   */
  private getSignedUrl(): string {
    if (!this.secret) {
      return this.webhookUrl;
    }

    // DingTalk signature algorithm
    const timestamp = Date.now();
    const stringToSign = `${timestamp}\n${this.secret}`;
    
    // Use crypto to create HMAC-SHA256 signature
    // In browser/Node.js environment:
    const signature = this.createSignature(stringToSign);
    
    // Append to URL
    const separator = this.webhookUrl.includes('?') ? '&' : '?';
    return `${this.webhookUrl}${separator}timestamp=${timestamp}&sign=${encodeURIComponent(signature)}`;
  }

  /**
   * Create HMAC-SHA256 signature
   * Simplified version - in production use crypto.createHmac
   */
  private createSignature(stringToSign: string): string {
    // Use built-in Node.js crypto
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', this.secret);
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  /**
   * POST to DingTalk API
   */
  private async postToDingTalk(url: string, payload: DingTalkPayload): Promise<void> {
    // Log the notification (placeholder for actual API call)
    console.log('=== DingTalk Notification ===');
    console.log(`Webhook: ${this.webhookUrl}`);
    console.log(`Message: ${payload.markdown.title}`);
    console.log(`Content: ${payload.markdown.text.substring(0, 100)}...`);
    console.log('-----------------------------');
    
    // In production, uncomment below:
    // const response = await fetch(url, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(payload),
    // });
    // 
    // if (!response.ok) {
    //   throw new Error(`DingTalk API error: ${response.status} ${response.statusText}`);
    // }
    
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send text message (alternative format)
   */
  async sendText(text: string): Promise<{ success: boolean; error?: string }> {
    const message: UnifiedMessage = {
      id: 'text',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS',
      content: text,
      timestamp: new Date(),
    };

    // Use markdown format for consistency
    const payload: DingTalkPayload = {
      msgtype: 'markdown',
      markdown: {
        title: 'AIDOS',
        text: text,
      },
    };

    try {
      const urlWithAuth = this.getSignedUrl();
      await this.postToDingTalk(urlWithAuth, payload);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Test DingTalk configuration
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    const testMessage: UnifiedMessage = {
      id: 'test',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS DingTalk Test',
      content: 'This is a test notification from AIDOS.',
      timestamp: new Date(),
    };

    return this.send(testMessage);
  }

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.webhookUrl) {
      errors.push('DingTalk webhook URL is required');
    }

    if (!this.webhookUrl.startsWith('https://')) {
      errors.push('DingTalk webhook URL must use HTTPS');
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
    return 'DingTalkService';
  }
}

export default DingTalkService;
