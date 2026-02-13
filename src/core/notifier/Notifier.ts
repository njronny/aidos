import { v4 as uuidv4 } from 'uuid';
import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotifierConfig,
  NotificationChannel,
  ChannelType,
  SendResult,
} from './types';

/**
 * Notifier - Message Notification Module
 * Handles sending notifications through various channels
 */
export class Notifier {
  private config: NotifierConfig;
  private history: Notification[] = [];
  private maxHistorySize: number;

  constructor(config: Partial<NotifierConfig> = {}) {
    this.maxHistorySize = 1000;

    this.config = {
      channels: config.channels ?? [{ type: 'console', config: {}, enabled: true }],
      enableMilestones: config.enableMilestones ?? true,
      enableErrors: config.enableErrors ?? true,
      enableProgress: config.enableProgress ?? false,
      progressInterval: config.progressInterval ?? 30,
      quietHours: config.quietHours,
    };
  }

  /**
   * Check if in quiet hours
   */
  private isQuietHours(): boolean {
    if (!this.config.quietHours) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const { start, end } = this.config.quietHours;

    return currentTime >= start && currentTime <= end;
  }

  /**
   * Create notification object
   */
  private createNotification(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    metadata?: Record<string, unknown>
  ): Notification {
    return {
      id: uuidv4(),
      type,
      title,
      message,
      timestamp: new Date(),
      priority,
      metadata,
    };
  }

  /**
   * Send notification through all enabled channels
   */
  async notify(
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'normal',
    metadata?: Record<string, unknown>
  ): Promise<SendResult[]> {
    // Check if notification should be sent based on type
    if (!this.shouldNotify(type)) {
      return [];
    }

    // Check quiet hours (skip for urgent/high priority)
    if (this.isQuietHours() && priority !== 'urgent') {
      return [];
    }

    const notification = this.createNotification(type, title, message, priority, metadata);
    this.addToHistory(notification);

    const results: SendResult[] = [];

    for (const channel of this.config.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, notification);
        results.push({ success: true, channel: channel.type });
      } catch (error) {
        results.push({
          success: false,
          channel: channel.type,
          error: (error as Error).message,
        });
      }
    }

    return results;
  }

  /**
   * Check if notification type should be sent
   */
  private shouldNotify(type: NotificationType): boolean {
    switch (type) {
      case 'milestone':
        return this.config.enableMilestones;
      case 'error':
        return this.config.enableErrors;
      case 'progress':
        return this.config.enableProgress;
      case 'completion':
      case 'alert':
        return true;
      default:
        return true;
    }
  }

  /**
   * Send notification to specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: Notification
  ): Promise<void> {
    switch (channel.type) {
      case 'console':
        await this.sendToConsole(notification);
        break;
      case 'webhook':
        await this.sendToWebhook(channel.config.webhookUrl!, notification);
        break;
      case 'telegram':
        await this.sendToTelegram(channel.config.botToken!, channel.config.chatId!, notification);
        break;
      case 'qq':
        await this.sendToQQ(channel.config.webhookUrl!, notification);
        break;
      case 'email':
        await this.sendToEmail(channel.config.email!, notification);
        break;
    }
  }

  /**
   * Send to console
   */
  private async sendToConsole(notification: Notification): Promise<void> {
    const prefix = this.getPriorityPrefix(notification.priority);
    console.log(
      `[${notification.timestamp.toISOString()}] ${prefix} ${notification.title}: ${notification.message}`
    );
  }

  /**
   * Get priority prefix
   */
  private getPriorityPrefix(priority: NotificationPriority): string {
    switch (priority) {
      case 'urgent':
        return '🔴';
      case 'high':
        return '🟠';
      case 'normal':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '';
    }
  }

  /**
   * Send to webhook
   */
  private async sendToWebhook(url: string, notification: Notification): Promise<void> {
    // Placeholder for webhook implementation
    console.log(`[Webhook] Would send to ${url}:`, notification);
  }

  /**
   * Send to Telegram
   */
  private async sendToTelegram(
    botToken: string,
    chatId: string,
    notification: Notification
  ): Promise<void> {
    // Placeholder for Telegram implementation
    console.log(`[Telegram] Would send to ${chatId}:`, notification);
  }

  /**
   * Send to QQ
   */
  private async sendToQQ(webhookUrl: string, notification: Notification): Promise<void> {
    // Placeholder for QQ webhook implementation
    console.log(`[QQ] Would send to ${webhookUrl}:`, notification);
  }

  /**
   * Send to email
   */
  private async sendToEmail(email: string, notification: Notification): Promise<void> {
    // Placeholder for email implementation
    console.log(`[Email] Would send to ${email}:`, notification);
  }

  /**
   * Notify milestone completion
   */
  async notifyMilestone(milestoneName: string, details?: string): Promise<SendResult[]> {
    return this.notify(
      'milestone',
      '🎉 Milestone Completed',
      `${milestoneName}${details ? `: ${details}` : ''}`,
      'high'
    );
  }

  /**
   * Notify error
   */
  async notifyError(error: string, context?: string): Promise<SendResult[]> {
    return this.notify(
      'error',
      '❌ Error Occurred',
      `${error}${context ? ` (${context})` : ''}`,
      'high'
    );
  }

  /**
   * Notify progress
   */
  async notifyProgress(
    completed: number,
    total: number,
    currentTask?: string
  ): Promise<SendResult[]> {
    const percentage = Math.round((completed / total) * 100);
    return this.notify(
      'progress',
      '📊 Progress Update',
      `${completed}/${total} (${percentage}%)${currentTask ? `: ${currentTask}` : ''}`,
      'low'
    );
  }

  /**
   * Notify completion
   */
  async notifyCompletion(projectName: string, duration?: number): Promise<SendResult[]> {
    const durationStr = duration ? ` in ${Math.round(duration / 60000)} minutes` : '';
    return this.notify(
      'completion',
      '✨ Project Completed',
      `${projectName} has been completed${durationStr}`,
      'normal'
    );
  }

  /**
   * Notify alert
   */
  async notifyAlert(alert: string, urgent = false): Promise<SendResult[]> {
    return this.notify(
      'alert',
      urgent ? '🚨 Alert' : '⚠️ Warning',
      alert,
      urgent ? 'urgent' : 'high'
    );
  }

  /**
   * Add notification to history
   */
  private addToHistory(notification: Notification): void {
    this.history.push(notification);
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get notification history
   */
  getHistory(limit?: number): Notification[] {
    if (limit) {
      return this.history.slice(-limit);
    }
    return [...this.history];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Add channel
   */
  addChannel(channel: NotificationChannel): void {
    this.config.channels.push(channel);
  }

  /**
   * Remove channel
   */
  removeChannel(type: ChannelType): boolean {
    const index = this.config.channels.findIndex((c) => c.type === type);
    if (index !== -1) {
      this.config.channels.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Enable/disable channel
   */
  setChannelEnabled(type: ChannelType, enabled: boolean): boolean {
    const channel = this.config.channels.find((c) => c.type === type);
    if (channel) {
      channel.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get configuration
   */
  getConfig(): NotifierConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotifierConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default Notifier;
