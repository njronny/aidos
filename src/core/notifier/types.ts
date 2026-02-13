// Notifier Types
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  priority: NotificationPriority;
  metadata?: Record<string, unknown>;
}

export type NotificationType = 'milestone' | 'error' | 'progress' | 'completion' | 'alert';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotifierConfig {
  channels: NotificationChannel[];
  enableMilestones: boolean;
  enableErrors: boolean;
  enableProgress: boolean;
  progressInterval: number; // minutes
  quietHours?: {
    start: string; // HH:mm
    end: string;
  };
}

export interface NotificationChannel {
  type: ChannelType;
  config: ChannelConfig;
  enabled: boolean;
}

export type ChannelType = 'console' | 'webhook' | 'email' | 'qq' | 'telegram';

export interface ChannelConfig {
  webhookUrl?: string;
  email?: string;
  botToken?: string;
  chatId?: string;
}

export interface SendResult {
  success: boolean;
  channel: ChannelType;
  error?: string;
}
