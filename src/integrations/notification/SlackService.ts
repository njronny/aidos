import { UnifiedMessage, SlackPayload, ChannelConfig } from '../../core/notifier/types';
import { MessageFormatter } from './MessageFormatter';

/**
 * Slack Service - Send notifications to Slack
 * Supports Incoming Webhooks and Bot API
 */
export class SlackService {
  private webhookUrl: string;
  private token: string;
  private channel: string;
  private username: string;
  private formatter: MessageFormatter;

  constructor(config: ChannelConfig) {
    // Prefer webhook over bot token
    this.webhookUrl = config.slackWebhook || '';
    this.token = config.slackToken || '';
    this.channel = config.slackChannel || '';
    this.username = config.slackUsername || 'AIDOS Notifications';
    this.formatter = new MessageFormatter();

    if (!this.webhookUrl && !this.token) {
      throw new Error('Either Slack webhook URL or bot token is required');
    }
  }

  /**
   * Send notification to Slack
   */
  async send(message: UnifiedMessage): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = this.formatter.formatForSlack(message);
      
      // Set optional channel and username
      if (this.channel) {
        payload.channel = this.channel;
      }
      payload.username = this.username;

      if (this.webhookUrl) {
        await this.sendViaWebhook(payload);
      } else if (this.token) {
        await this.sendViaAPI(payload);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Send via Incoming Webhook
   */
  private async sendViaWebhook(payload: SlackPayload): Promise<void> {
    // Log the notification (placeholder for actual webhook call)
    console.log('=== Slack Notification (Webhook) ===');
    console.log(`Webhook: ${this.webhookUrl}`);
    console.log(`Channel: ${payload.channel || 'default'}`);
    console.log(`Message: ${payload.text}`);
    console.log('------------------------------------');
    
    // In production, uncomment below:
    // const response = await fetch(this.webhookUrl, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(payload),
    // });
    // 
    // if (!response.ok) {
    //   const errorText = await response.text();
    //   throw new Error(`Slack webhook error: ${response.status} - ${errorText}`);
    // }
    
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send via Slack API (chat.postMessage)
   */
  private async sendViaAPI(payload: SlackPayload): Promise<void> {
    if (!payload.blocks) {
      throw new Error('Block kit is required for Slack API');
    }

    // Log the notification (placeholder for actual API call)
    console.log('=== Slack Notification (API) ===');
    console.log(`Token: ${this.token.substring(0, 10)}...`);
    console.log(`Channel: ${payload.channel || this.channel}`);
    console.log(`Message: ${payload.text}`);
    console.log('---------------------------------');

    // In production, uncomment below:
    // const response = await fetch('https://slack.com/api/chat.postMessage', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${this.token}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     channel: payload.channel || this.channel,
    //     username: payload.username,
    //     text: payload.text,
    //     blocks: payload.blocks,
    //     attachments: payload.attachments,
    //   }),
    // });
    // 
    // const result = await response.json();
    // if (!result.ok) {
    //   throw new Error(`Slack API error: ${result.error}`);
    // }
    
    // Simulate async delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send a simple text message
   */
  async sendText(text: string, channel?: string): Promise<{ success: boolean; error?: string }> {
    const message: UnifiedMessage = {
      id: 'text',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS',
      content: text,
      timestamp: new Date(),
    };

    return this.send(message);
  }

  /**
   * Send with custom blocks
   */
  async sendWithBlocks(blocks: SlackPayload['blocks'], text?: string): Promise<{ success: boolean; error?: string }> {
    const message: UnifiedMessage = {
      id: 'custom',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS',
      content: text || '',
      timestamp: new Date(),
    };

    const payload = this.formatter.formatForSlack(message);
    payload.blocks = blocks;
    payload.text = text || '';

    if (this.channel) {
      payload.channel = this.channel;
    }
    payload.username = this.username;

    try {
      if (this.webhookUrl) {
        await this.sendViaWebhook(payload);
      } else {
        await this.sendViaAPI(payload);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Test Slack configuration
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    const testMessage: UnifiedMessage = {
      id: 'test',
      type: 'alert',
      priority: 'normal',
      title: 'AIDOS Slack Test',
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

    if (!this.webhookUrl && !this.token) {
      errors.push('Either Slack webhook URL or bot token is required');
    }

    if (this.webhookUrl && !this.webhookUrl.startsWith('https://hooks.slack.com/')) {
      errors.push('Invalid Slack webhook URL format');
    }

    if (this.token && !this.token.startsWith('xoxb-')) {
      errors.push('Invalid Slack bot token format (should start with xoxb-)');
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
    return 'SlackService';
  }
}

export default SlackService;
