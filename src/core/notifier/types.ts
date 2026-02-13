// Extended Notifier Types
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

export type ChannelType = 'console' | 'webhook' | 'email' | 'qq' | 'telegram' | 'dingtalk' | 'slack';

export interface ChannelConfig {
  webhookUrl?: string;
  email?: string;
  botToken?: string;
  chatId?: string;
  // Email config
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
  // DingTalk config
  dingtalkWebhook?: string;
  dingtalkSecret?: string;
  // Slack config
  slackWebhook?: string;
  slackToken?: string;
  slackChannel?: string;
  slackUsername?: string;
}

export interface SendResult {
  success: boolean;
  channel: ChannelType;
  error?: string;
}

// Unified Message Format
export interface UnifiedMessage {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  content: string;
  template?: string;
  templateData?: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Message Templates
export interface MessageTemplate {
  id: string;
  name: string;
  subject?: string; // For email
  title?: string;
  content: string;
  variables: string[];
}

// Template Variables
export interface TemplateVariables {
  projectName?: string;
  taskName?: string;
  progress?: number;
  completed?: number;
  total?: number;
  duration?: number;
  error?: string;
  context?: string;
  details?: string;
  alert?: string;
  urgent?: boolean;
  timestamp?: Date;
  [key: string]: unknown;
}

// Channel-specific message formatters
export interface MessageFormatter {
  formatForEmail(message: UnifiedMessage): EmailPayload;
  formatForDingTalk(message: UnifiedMessage): DingTalkPayload;
  formatForSlack(message: UnifiedMessage): SlackPayload;
}

// Email Payload
export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  fromName?: string;
}

// DingTalk Payload (Markdown format)
export interface DingTalkPayload {
  msgtype: 'markdown' | 'text';
  markdown: {
    title: string;
    text: string;
  };
  text?: {
    content: string;
  };
}

// Slack Payload (Block Kit format)
export interface SlackPayload {
  channel?: string;
  username?: string;
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

// Slack Block Kit
export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: {
    type: string;
    text?: { type: string; text: string; emoji?: boolean };
    url?: string;
  };
}

// Slack Attachment
export interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  footer?: string;
  ts?: number;
  fields?: Array<{
    title: string;
    value: string;
    short?: boolean;
  }>;
}
